
type SampleCase = { id: string; input: string; expected: string };

type ProblemView = {
  title: string;
  difficulty: string;
  tags: string[];
  statement: string;
  testCases: SampleCase[];
};

type Props = {
  code: string;
  isHost: boolean;
  problem: ProblemView | null;
  options: { id: string; title: string; difficulty: string }[];
};

const DIFFICULTY_COLOR: Record<string, string> = {
  EASY: "text-verdict",
  MEDIUM: "text-flood",
  HARD: "text-red-400",
};

export function ProblemPanel({ code, isHost, problem, options }: Props) {
  return (
    <section className="mb-6 rounded-lg border border-ink-line bg-ink-raised">
      <div className="flex flex-wrap items-center gap-3 border-b border-ink-line px-4 py-3">
        <h2 className="font-mono text-xs tracking-[0.2em] text-chalk-dim">
          PROBLEM
        </h2>

        {problem && (
          <>
            <span className="text-sm text-chalk">{problem.title}</span>
            <span
              className={`font-mono text-[11px] ${
                DIFFICULTY_COLOR[problem.difficulty] ?? "text-chalk-dim"
              }`}
            >
              {problem.difficulty.toLowerCase()}
            </span>
          </>
        )}

      </div>

      {!problem ? (
        <p className="px-4 py-8 text-center font-mono text-xs text-chalk-dim">
          {isHost
            ? "Pick a problem to start the round."
            : "Waiting for the host to pick a problem."}
        </p>
      ) : (
        <div className="grid gap-6 px-4 py-4 lg:grid-cols-[1fr_320px]">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-chalk-dim">
            {problem.statement}
          </div>

          <div>
            <h3 className="mb-2 font-mono text-[11px] tracking-[0.2em] text-chalk-dim">
              SAMPLES
            </h3>
            <div className="space-y-2">
              {problem.testCases.map((t, i) => (
                <div
                  key={t.id}
                  className="rounded border border-ink-line bg-ink p-3"
                >
                  <p className="mb-1 font-mono text-[10px] text-chalk-dim">
                    example {i + 1}
                  </p>
                  <pre className="whitespace-pre-wrap font-mono text-xs text-chalk">
                    {t.input}
                  </pre>
                  <p className="mt-2 font-mono text-[10px] text-chalk-dim">
                    output
                  </p>
                  <pre className="whitespace-pre-wrap font-mono text-xs text-verdict">
                    {t.expected}
                  </pre>
                </div>
              ))}
            </div>

            {problem.tags.length > 0 && (
              <p className="mt-3 font-mono text-[10px] text-chalk-dim">
                {problem.tags.join(" · ")}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
