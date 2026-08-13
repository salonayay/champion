// Talks to Piston, a sandboxed code execution service.
//
// Piston runs submitted code in an isolated container with a time limit and no
// network access, then hands back whatever the program printed. We compare that
// against the expected output ourselves.
//
// The public instance needs no key and no account. It's rate limited to about
// 5 requests per second, which is fine here because tests run one at a time.
// For real traffic you'd self-host Piston with Docker and point PISTON_URL at
// your own server -- nothing else in this file would change.

import type { LanguageKey } from "@/lib/languages";

const PISTON_URL =
  process.env.PISTON_URL ?? "https://emkc.org/api/v2/piston/execute";

// Piston identifies languages by name, not number.
const PISTON_LANGUAGES: Record<LanguageKey, string> = {
  PYTHON: "python",
  CPP: "c++",
  JAVA: "java",
  JAVASCRIPT: "javascript",
};

// Java insists the file name match the public class name.
const FILE_NAMES: Record<LanguageKey, string> = {
  PYTHON: "main.py",
  CPP: "main.cpp",
  JAVA: "Main.java",
  JAVASCRIPT: "main.js",
};

export type JudgeResult = {
  verdict: string;
  stdout: string | null;
  stderr: string | null;
  timeMs: number | null;
};

// Competitive judges ignore trailing spaces and blank lines at the end, because
// "your answer is right but you printed a newline" is a terrible way to lose.
function normalise(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

export async function runTestCase(opts: {
  source: string;
  language: LanguageKey;
  stdin: string;
  expected: string;
  timeLimitMs: number;
}): Promise<JudgeResult> {
  const started = Date.now();

  let res: Response;
  try {
    res = await fetch(PISTON_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        language: PISTON_LANGUAGES[opts.language],
        version: "*", // let Piston pick its newest available version
        files: [
          { name: FILE_NAMES[opts.language], content: opts.source },
        ],
        stdin: opts.stdin,
        run_timeout: opts.timeLimitMs,
        compile_timeout: 10000,
      }),
      cache: "no-store",
    });
  } catch (e) {
    return {
      verdict: "RUNTIME_ERROR",
      stdout: null,
      stderr: `Could not reach the judge. ${String(e).slice(0, 150)}`,
      timeMs: null,
    };
  }

  if (res.status === 429) {
    return {
      verdict: "RUNTIME_ERROR",
      stdout: null,
      stderr: "Judge is rate limited. Wait a few seconds and try again.",
      timeMs: null,
    };
  }

  if (!res.ok) {
    const body = await res.text();
    return {
      verdict: "RUNTIME_ERROR",
      stdout: null,
      stderr: `Judge returned ${res.status}. ${body.slice(0, 200)}`,
      timeMs: null,
    };
  }

  const data = await res.json();
  const timeMs = Date.now() - started;

  // A compile step only exists for compiled languages. A non-zero code there
  // means the code never ran at all.
  if (data.compile && data.compile.code !== 0) {
    return {
      verdict: "COMPILE_ERROR",
      stdout: null,
      stderr: data.compile.stderr || data.compile.output || "Compilation failed.",
      timeMs,
    };
  }

  const run = data.run ?? {};

  // Piston kills a program that exceeds run_timeout, which surfaces as a
  // signal rather than a normal exit.
  if (run.signal === "SIGKILL" || run.signal === "SIGTERM") {
    return {
      verdict: "TIME_LIMIT_EXCEEDED",
      stdout: run.stdout ?? null,
      stderr: run.stderr ?? null,
      timeMs,
    };
  }

  if (run.code !== 0) {
    return {
      verdict: "RUNTIME_ERROR",
      stdout: run.stdout ?? null,
      stderr: run.stderr || "Program exited with a non-zero status.",
      timeMs,
    };
  }

  const got = normalise(run.stdout ?? "");
  const want = normalise(opts.expected);

  return {
    verdict: got === want ? "ACCEPTED" : "WRONG_ANSWER",
    stdout: run.stdout ?? null,
    stderr: run.stderr || null,
    timeMs,
  };
}
