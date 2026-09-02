import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ResultsButton, type StandingRow } from "@/components/ResultsButton";
import { addMemberToRoom, leaveRoom } from "@/app/actions/rooms";
import { RoomWorkspaces } from "@/components/RoomWorkspaces";
import { ProblemPanel } from "@/components/ProblemPanel";
import { RoundBar } from "@/components/RoundBar";
import { Scoreboard } from "@/components/Scoreboard";

// In Next.js 15, params arrives as a Promise, so it has to be awaited.
// This page lives at src/app/room/[code]/page.tsx — the [code] folder is what
// makes /room/K7Q2XM work for any code, with the value handed to us here.

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();

  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const room = await prisma.room.findUnique({
    where: { code },
    include: {
      // Pull the members AND each member's user record in one query. Without
      // the nested include we'd have their ids but not their names, and we'd
      // need a second query per member — the "N+1 query" problem.
      members: {
        include: { user: { select: { id: true, username: true, image: true, rating: true } } },
        orderBy: { seat: "asc" },
      },
      host: { select: { username: true } },
    },
  });

  if (!room) notFound();

  const match = await prisma.match.findFirst({
    where: { roomId: room.id, status: { in: ["PENDING", "LIVE", "FINISHED"] } },
    orderBy: { startedAt: "desc" },
    include: {
      problem: { include: { testCases: { where: { isSample: true } } } },
    },
  });

  const winner = match?.winnerId
    ? await prisma.user.findUnique({
        where: { id: match.winnerId },
        select: { username: true },
      })
    : null;

  // Every attempt in this match, oldest first, so we can work out each
  // player's latest result and how many tries it took them.
  const rawAttempts = match
    ? await prisma.submission.findMany({
        where: { matchId: match.id },
        orderBy: { submittedAt: "asc" },
        select: {
          userId: true,
          kind: true,
          verdict: true,
          passedCount: true,
          totalCount: true,
        },
      })
    : [];

  const attempts: Record<string, {
    kind: string;
    verdict: string;
    passedCount: number | null;
    totalCount: number | null;
    attemptNumber: number;
  }> = {};

  for (const a of rawAttempts) {
    const previous = attempts[a.userId]?.attemptNumber ?? 0;
    attempts[a.userId] = { ...a, attemptNumber: previous + 1 };
  }

  const allMatches = await prisma.match.findMany({
    where: { roomId: room.id },
    orderBy: { roundNumber: "asc" },
    include: {
      problem: { select: { title: true, difficulty: true } },
      submissions: { select: { userId: true, kind: true } },
      ratingChanges: { select: { userId: true, delta: true, ratingAfter: true } },
    },
  });

  // Winner names in one query rather than one per row.
  const winnerIds = allMatches
    .map((m) => m.winnerId)
    .filter((id): id is string => Boolean(id));

  const winnerUsers = winnerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: winnerIds } },
        select: { id: true, username: true },
      })
    : [];
  const nameById = new Map(winnerUsers.map((u) => [u.id, u.username]));

  const scoreboardRows = allMatches
    .filter((m) => m.status === "FINISHED")
    .map((m) => ({
      roundNumber: m.roundNumber,
      problemTitle: m.problem.title,
      difficulty: m.problem.difficulty,
      winnerName: m.winnerId ? (nameById.get(m.winnerId) ?? null) : null,
      timeMs:
        m.startedAt && m.endedAt
          ? m.endedAt.getTime() - m.startedAt.getTime()
          : null,
      // How many times the winner had to submit before it was accepted.
      attempts: m.winnerId
        ? m.submissions.filter(
            (sub) => sub.userId === m.winnerId && sub.kind === "SUBMIT",
          ).length
        : 0,
      myDelta:
        m.ratingChanges.find((rc) => rc.userId === session.user.id)?.delta ??
        null,
      settled: m.settledAt !== null,
    }));

  const roundsPlayed = allMatches.length;
  const liveMatch = allMatches.find(
    (m) => m.status === "LIVE" || m.status === "PENDING",
  );

  const problemOptions = await prisma.problem.findMany({
    select: { id: true, title: true, difficulty: true },
    orderBy: { difficulty: "asc" },
  }); // renders Next.js's 404 page

  // A scheduled room is sealed until its time -- including for the host. The
  // check is here on the server, so nobody gets in by guessing the URL.
  if (room.scheduledFor && room.scheduledFor.getTime() > Date.now()) {
    const opensAt = room.scheduledFor;
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="font-mono text-xs tracking-[0.3em] text-chalk-dim">
          LOCKED
        </p>
        <h1 className="mt-2 font-mono text-4xl tracking-[0.2em] text-flood">
          {room.code}
        </h1>
        <p className="mt-6 text-chalk-dim">This room opens at</p>
        <p className="mt-1 font-mono text-lg text-chalk">
          {opensAt.toLocaleString()}
        </p>
        <p className="mt-6 font-mono text-xs text-chalk-dim">
          {room.totalRounds} rounds &middot;{" "}
          {room.difficulty ? room.difficulty.toLowerCase() : "any difficulty"}{" "}
          &middot; {room.members.length} of {room.maxSeats} joined
        </p>
        <a
          href="/"
          className="mt-8 inline-block text-sm text-chalk-dim hover:text-chalk"
        >
          Back home
        </a>
      </main>
    );
  }

  const me = room.members.find((m) => m.userId === session.user.id);

  // Arrived via a shared link but not a member yet — show a join screen.
  if (!me) {
    const full = room.members.length >= room.maxSeats;

    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="font-mono text-xs tracking-[0.3em] text-chalk-dim">
          ROOM
        </p>
        <h1
          className="mt-2 font-mono text-4xl tracking-[0.2em] text-flood"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {room.code}
        </h1>
        <p className="mt-4 text-chalk-dim">
          Hosted by {room.host.username ?? "someone"} &middot;{" "}
          {room.members.length} of {room.maxSeats} seats taken
        </p>

        {full ? (
          <p className="mt-8 text-red-400">This room is full.</p>
        ) : (
          <form
            action={async () => {
              "use server";
              await addMemberToRoom(code, session.user.id);
              redirect(`/room/${code}`);
            }}
            className="mt-8"
          >
            <button
              type="submit"
              className="rounded-md bg-flood px-6 py-3 font-medium text-ink hover:opacity-90"
            >
              Join this room
            </button>
          </form>
        )}

        <Link
          href="/"
          className="mt-6 inline-block text-sm text-chalk-dim hover:text-chalk"
        >
          Back home
        </Link>
      </main>
    );
  }

  // Build a fixed array of seats so empty ones render as placeholders rather
  // than the grid collapsing to however many people happen to be present.
  const seats = Array.from({ length: room.maxSeats }, (_, i) => {
    return room.members.find((m) => m.seat === i) ?? null;
  });


  const settledMatches = allMatches.filter((m) => m.settledAt);

  const standings: StandingRow[] = room.members.map((mem) => ({
    userId: mem.userId,
    username: mem.user.username ?? "player",
    rounds: settledMatches.length,
    wins: settledMatches.filter((m) => m.winnerId === mem.userId).length,
    delta: settledMatches.reduce(
      (sum, m) =>
        sum +
        m.ratingChanges
          .filter((rc) => rc.userId === mem.userId)
          .reduce((t, rc) => t + rc.delta, 0),
      0,
    ),
    rating: mem.user.rating,
  }));

  return (
    <main className="px-4 py-8 sm:px-6">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-chalk-dim">
            ROOM CODE
          </p>
          <h1 className="mt-1 font-mono text-4xl tracking-[0.25em] text-flood">
            {room.code}
          </h1>
          <p className="mt-2 text-sm text-chalk-dim">
            Share this code. {room.members.length} of {room.maxSeats} seats
            taken.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ResultsButton
            rows={standings}
            meId={session.user.id}
            roundsDone={settledMatches.length}
            roundsTotal={room.totalRounds}
          />
        <form action={leaveRoom}>
          <input type="hidden" name="code" value={room.code} />
          <button
            type="submit"
            className="rounded-md border border-ink-line px-4 py-2 text-sm text-chalk-dim transition-colors hover:border-red-400 hover:text-red-400"
          >
            Leave room
          </button>
        </form>
        </div>
      </header>

      <RoundBar
        code={room.code}
        isHost={room.hostId === session.user.id}
        totalRounds={room.totalRounds}
        roundsPlayed={roundsPlayed}
        currentRound={liveMatch?.roundNumber ?? null}
        startedAt={match?.startedAt?.toISOString() ?? null}
        endedAt={match?.endedAt?.toISOString() ?? null}
        difficulty={room.difficulty}
        canStart={!liveMatch && roundsPlayed < room.totalRounds}
      />

      <Scoreboard rows={scoreboardRows} />

      <ProblemPanel
        code={room.code}
        isHost={room.hostId === session.user.id}
        problem={match?.problem ?? null}
        options={problemOptions}
      />

      <RoomWorkspaces
        roomCode={room.code}
        matchId={match?.id ?? null}
        problemId={match?.problemId ?? null}
        winnerName={winner?.username ?? null}
        attempts={attempts}
        seats={seats.map((m, i) =>
          m
            ? {
                seat: i,
                userId: m.userId,
                username: m.user.username,
                image: m.user.image,
                isHost: m.userId === room.hostId,
              }
            : null,
        )}
        currentUserId={session.user.id}
      />

      <p className="mt-8 font-mono text-xs text-chalk-dim">
        Refresh to see who joined &mdash; live presence arrives in step 3b.
      </p>
    </main>
  );
}
