"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { runTestCase } from "@/lib/judge";
import type { LanguageKey } from "@/lib/languages";

export type CaseResult = {
  index: number;
  verdict: string;
  hidden: boolean;
  input?: string;
  expected?: string;
  got?: string | null;
  stderr?: string | null;
  timeMs?: number | null;
};

export type RunOutcome = {
  ok: boolean;
  verdict: string;
  cases: CaseResult[];
  message?: string;
  wonMatch?: boolean;
};

// Run -- checks only the visible sample cases. Nothing is recorded.
export async function runSamples(input: {
  problemId: string;
  source: string;
  language: LanguageKey;
  matchId?: string | null;
  roomCode?: string;
}): Promise<RunOutcome> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, verdict: "RUNTIME_ERROR", cases: [], message: "Not signed in." };
  }

  const problem = await prisma.problem.findUnique({
    where: { id: input.problemId },
    include: { testCases: { where: { isSample: true } } },
  });

  if (!problem) {
    return { ok: false, verdict: "RUNTIME_ERROR", cases: [], message: "Problem not found." };
  }

  const cases: CaseResult[] = [];

  for (const [i, t] of problem.testCases.entries()) {
    const r = await runTestCase({
      source: input.source,
      language: input.language,
      stdin: t.input,
      expected: t.expected,
      timeLimitMs: problem.timeLimitMs,
    });

    cases.push({
      index: i,
      verdict: r.verdict,
      hidden: false,
      input: t.input,
      expected: t.expected,
      got: r.stdout,
      stderr: r.stderr,
      timeMs: r.timeMs,
    });

    if (r.verdict !== "ACCEPTED") {
      await recordAttempt(input.matchId, session.user.id, input, "RUN", r.verdict, cases);
      if (input.roomCode) revalidatePath(`/room/${input.roomCode}`);
      return { ok: false, verdict: r.verdict, cases, message: r.stderr ?? undefined };
    }
  }

  await recordAttempt(input.matchId, session.user.id, input, "RUN", "ACCEPTED", cases);
  if (input.roomCode) revalidatePath(`/room/${input.roomCode}`);

  return { ok: true, verdict: "ACCEPTED", cases };
}

// Saves an attempt so everyone else's panel can show how it went.
async function recordAttempt(
  matchId: string | null | undefined,
  userId: string,
  input: { source: string; language: LanguageKey },
  kind: "RUN" | "SUBMIT",
  verdict: string,
  cases: CaseResult[],
) {
  if (!matchId) return; // no live match, nothing to attach to
  await prisma.submission.create({
    data: {
      matchId,
      userId,
      code: input.source,
      language: input.language,
      kind,
      verdict: verdict as never,
      passedCount: cases.filter((c) => c.verdict === "ACCEPTED").length,
      totalCount: cases.length,
      judgedAt: new Date(),
    },
  });
}

// Submit -- runs every test, records the attempt, and may decide the winner.
export async function submitSolution(input: {
  matchId: string;
  source: string;
  language: LanguageKey;
  roomCode: string;
}): Promise<RunOutcome> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, verdict: "RUNTIME_ERROR", cases: [], message: "Not signed in." };
  }
  const userId = session.user.id;

  const match = await prisma.match.findUnique({
    where: { id: input.matchId },
    include: { problem: { include: { testCases: true } } },
  });

  if (!match) {
    return { ok: false, verdict: "RUNTIME_ERROR", cases: [], message: "No live match." };
  }

  if (match.status === "FINISHED") {
    return { ok: false, verdict: "WRONG_ANSWER", cases: [], message: "This round is already over." };
  }

  // Created BEFORE judging, so submittedAt is stamped by the database the
  // moment the attempt arrives -- not when judging finished, which depends on
  // how slow the judge was and how many tests ran first.
  const submission = await prisma.submission.create({
    data: {
      matchId: match.id,
      userId,
      code: input.source,
      language: input.language,
      kind: "SUBMIT",
      verdict: "RUNNING",
    },
  });

  const cases: CaseResult[] = [];
  let finalVerdict = "ACCEPTED";
  let failedCase: number | null = null;
  let stderr: string | null = null;

  for (const [i, t] of match.problem.testCases.entries()) {
    const r = await runTestCase({
      source: input.source,
      language: input.language,
      stdin: t.input,
      expected: t.expected,
      timeLimitMs: match.problem.timeLimitMs,
    });

    // Hidden cases report pass/fail and nothing else. Leaking the input or the
    // expected output would let someone reverse-engineer the answers.
    cases.push({
      index: i,
      verdict: r.verdict,
      hidden: !t.isSample,
      ...(t.isSample ? { input: t.input, expected: t.expected, got: r.stdout } : {}),
      timeMs: r.timeMs,
    });

    if (r.verdict !== "ACCEPTED") {
      finalVerdict = r.verdict;
      failedCase = i;
      stderr = r.stderr;
      break;
    }
  }

  await prisma.submission.update({
    where: { id: submission.id },
    data: {
      verdict: finalVerdict as never,
      failedCase,
      errorOutput: stderr,
      judgedAt: new Date(),
      passedCount: cases.filter((c) => c.verdict === "ACCEPTED").length,
      totalCount: match.problem.testCases.length,
    },
  });

  let wonMatch = false;

  if (finalVerdict === "ACCEPTED") {
    // The race, resolved in one statement. `winnerId: null` means this only
    // updates a match with no winner yet. If two people are accepted
    // milliseconds apart, one update applies and the other matches zero rows.
    const claimed = await prisma.match.updateMany({
      where: { id: match.id, winnerId: null },
      data: { winnerId: userId, status: "FINISHED", endedAt: new Date() },
    });
    wonMatch = claimed.count === 1;
  }

  revalidatePath(`/room/${input.roomCode}`);

  return {
    ok: finalVerdict === "ACCEPTED",
    verdict: finalVerdict,
    cases,
    wonMatch,
    message: stderr ?? undefined,
  };
}
