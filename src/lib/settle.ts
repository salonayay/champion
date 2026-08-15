import { prisma } from "@/lib/prisma";
import { winDelta, lossDelta, applyDelta, type Difficulty } from "@/lib/rating";

// Applies ratings for one finished round.
//
// Runs when the NEXT round starts, not the moment someone wins. That gap is
// deliberate: losers can keep working after the race is lost and still get an
// accepted verdict, which protects their rating. Only players who never got
// it right take the hit.
export async function settleRound(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      problem: { select: { difficulty: true } },
      participants: { select: { userId: true } },
      submissions: {
        where: { verdict: "ACCEPTED", kind: "SUBMIT" },
        select: { userId: true },
      },
    },
  });

  if (!match) return;
  if (match.settledAt) return; // already done

  const difficulty = match.problem.difficulty as Difficulty;
  const solvers = new Set(match.submissions.map((s) => s.userId));

  // Claim the settle first. If two requests race, only one gets count 1 and
  // the other exits without awarding anything twice.
  const claimed = await prisma.match.updateMany({
    where: { id: matchId, settledAt: null },
    data: { settledAt: new Date() },
  });
  if (claimed.count !== 1) return;

  for (const p of match.participants) {
    const isWinner = p.userId === match.winnerId;
    const solved = solvers.has(p.userId);

    // Winner gains. Anyone who solved it late stays flat. Everyone else drops.
    let delta = 0;
    if (isWinner) delta = winDelta(difficulty);
    else if (!solved) delta = lossDelta(difficulty);

    if (delta === 0) continue;

    const user = await prisma.user.findUnique({
      where: { id: p.userId },
      select: { rating: true },
    });
    if (!user) continue;

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
  }
}
