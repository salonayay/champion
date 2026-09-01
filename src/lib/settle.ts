import { prisma } from "@/lib/prisma";
import { winDelta, lossDelta, applyDelta, type Difficulty } from "@/lib/rating";

export type SettleOutcome = "WIN" | "SOLVED" | "MISS";

export type SettleResult = {
  userId: string;
  username: string;
  delta: number;
  ratingAfter: number;
  outcome: SettleOutcome;
};

export type SettleSummary = {
  matchId: string;
  roundNumber: number;
  problemTitle: string;
  difficulty: Difficulty;
  results: SettleResult[];
} | null;

// Applies ratings for one finished round.
//
// Runs when the NEXT round starts, not the moment someone wins. That gap is
// deliberate: losers can keep working after the race is lost and still get an
// accepted verdict, which protects their rating. Only players who never got
// it right take the hit.
//
// Returns a summary of what changed so the caller can broadcast it, or null
// if this round was already settled (or does not exist).
export async function settleRound(matchId: string): Promise<SettleSummary> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      problem: { select: { title: true, difficulty: true } },
      participants: {
        select: { userId: true, user: { select: { username: true, name: true } } },
      },
      submissions: {
        where: { verdict: "ACCEPTED", kind: "SUBMIT" },
        select: { userId: true },
      },
    },
  });
  if (!match) return null;
  if (match.settledAt) return null; // already done

  const difficulty = match.problem.difficulty as Difficulty;
  const solvers = new Set(match.submissions.map((s) => s.userId));

  // Claim the settle first. If two requests race, only one gets count 1 and
  // the other exits without awarding anything twice.
  const claimed = await prisma.match.updateMany({
    where: { id: matchId, settledAt: null },
    data: { settledAt: new Date() },
  });
  if (claimed.count !== 1) return null;

  const results: SettleResult[] = [];

  for (const p of match.participants) {
    const isWinner = p.userId === match.winnerId;
    const solved = solvers.has(p.userId);

    // Winner gains. Anyone who solved it late stays flat. Everyone else drops.
    let delta = 0;
    if (isWinner) delta = winDelta(difficulty);
    else if (!solved) delta = lossDelta(difficulty);

    const outcome: SettleOutcome = isWinner ? "WIN" : solved ? "SOLVED" : "MISS";

    const user = await prisma.user.findUnique({
      where: { id: p.userId },
      select: { rating: true },
    });
    if (!user) continue;

    const username = p.user.username ?? p.user.name ?? "player";

    // Flat outcomes still get reported, they just do not touch the database.
    if (delta === 0) {
      results.push({
        userId: p.userId,
        username,
        delta: 0,
        ratingAfter: user.rating,
        outcome,
      });
      continue;
    }

    const ratingAfter = applyDelta(user.rating, delta);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: p.userId },
        data: { rating: ratingAfter },
      });
      await tx.ratingChange.create({
        data: { matchId, userId: p.userId, delta, ratingAfter },
      });
    });

    results.push({ userId: p.userId, username, delta, ratingAfter, outcome });
  }

  // Winner first, then biggest gain to biggest loss.
  results.sort((a, b) => b.delta - a.delta);

  return {
    matchId,
    roundNumber: match.roundNumber,
    problemTitle: match.problem.title,
    difficulty,
    results,
  };
}
