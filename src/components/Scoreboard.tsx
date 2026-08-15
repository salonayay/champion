type Row = {
  roundNumber: number;
  problemTitle: string;
  difficulty: string;
  winnerName: string | null;
  timeMs: number | null;
  attempts: number;
  myDelta: number | null;
  settled: boolean;
};

function formatTime(ms: number | null) {
  if (ms == null) return "--";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function Scoreboard({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return null;

  return (
    <section className="mb-4 overflow-hidden rounded-lg border border-ink-line bg-ink-raised">
      <h2 className="border-b border-ink-line px-4 py-2 font-mono text-[10px] tracking-[0.2em] text-chalk-dim">
        SCOREBOARD
      </h2>
      <table className="w-full text-left">
        <thead>
          <tr className="font-mono text-[10px] text-chalk-dim">
            <th className="px-4 py-2 font-normal">round</th>
            <th className="px-4 py-2 font-normal">problem</th>
            <th className="px-4 py-2 font-normal">winner</th>
            <th className="px-4 py-2 font-normal">time</th>
            <th className="px-4 py-2 font-normal">attempts</th>
            <th className="px-4 py-2 font-normal">your rating</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.roundNumber} className="border-t border-ink-line">
              <td className="px-4 py-2 font-mono text-xs text-chalk-dim">{r.roundNumber}</td>
              <td className="px-4 py-2 text-sm text-chalk">
                {r.problemTitle}
                <span className="ml-2 font-mono text-[10px] text-chalk-dim">
                  {r.difficulty.toLowerCase()}
                </span>
              </td>
              <td className="px-4 py-2 font-mono text-xs">
                {r.winnerName ? (
                  <span className="text-flood">{r.winnerName}</span>
                ) : (
                  <span className="text-chalk-dim">nobody solved it</span>
                )}
              </td>
              <td className="px-4 py-2 font-mono text-xs tabular-nums text-chalk">
                {formatTime(r.timeMs)}
              </td>
              <td className="px-4 py-2 font-mono text-xs text-chalk-dim">
                {r.attempts || "--"}
              </td>
              <td className="px-4 py-2 font-mono text-xs">
                {!r.settled ? (
                  <span className="text-chalk-dim">pending</span>
                ) : r.myDelta === null || r.myDelta === 0 ? (
                  <span className="text-chalk-dim">no change</span>
                ) : r.myDelta > 0 ? (
                  <span className="text-flood">+{r.myDelta}</span>
                ) : (
                  <span className="text-red-400">{r.myDelta}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
