"use client";

import { useEffect, useState } from "react";

export type StandingRow = {
  userId: string;
  username: string;
  rounds: number;
  wins: number;
  delta: number;
  rating: number;
};

export function ResultsButton({
  rows,
  meId,
  roundsDone,
  roundsTotal,
}: {
  rows: StandingRow[];
  meId: string;
  roundsDone: number;
  roundsTotal: number;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const sorted = [...rows].sort(
    (a, b) => b.wins - a.wins || b.rating - a.rating,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-ink-line px-4 py-2 font-mono text-xs tracking-[0.15em] text-chalk-dim transition-colors hover:border-flood hover:text-flood"
      >
        SHOW RESULTS
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-lg border border-ink-line bg-ink-raised"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-ink-line px-4 py-3">
              <div>
                <h2 className="font-mono text-[10px] tracking-[0.2em] text-chalk-dim">
                  RESULTS
                </h2>
                <p className="mt-1 font-mono text-xs text-chalk">
                  round {roundsDone} of {roundsTotal}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded px-2 py-1 font-mono text-sm text-chalk-dim transition-colors hover:text-chalk"
              >
                ESC
              </button>
            </div>

            <table className="w-full text-left">
              <thead>
                <tr className="font-mono text-[10px] text-chalk-dim">
                  <th className="px-4 py-2 font-normal">player</th>
                  <th className="px-4 py-2 font-normal">rounds</th>
                  <th className="px-4 py-2 font-normal">wins</th>
                  <th className="px-4 py-2 font-normal">change</th>
                  <th className="px-4 py-2 font-normal">rating</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr
                    key={r.userId}
                    className={
                      "border-t border-ink-line " +
                      (r.userId === meId ? "bg-white/[0.03]" : "")
                    }
                  >
                    <td className="px-4 py-2 text-sm">
                      <span
                        className={
                          r.userId === meId ? "text-flood" : "text-chalk"
                        }
                      >
                        {r.username}
                      </span>
                      {r.userId === meId ? (
                        <span className="ml-2 font-mono text-[10px] text-chalk-dim">
                          you
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs tabular-nums text-chalk-dim">
                      {r.rounds}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs tabular-nums text-chalk">
                      {r.wins}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs tabular-nums">
                      {r.delta === 0 ? (
                        <span className="text-chalk-dim">0</span>
                      ) : r.delta > 0 ? (
                        <span className="text-flood">+{r.delta}</span>
                      ) : (
                        <span className="text-red-400">{r.delta}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs tabular-nums text-chalk">
                      {r.rating}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {roundsDone === 0 ? (
              <p className="border-t border-ink-line px-4 py-3 font-mono text-[10px] text-chalk-dim">
                no rounds settled yet
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
