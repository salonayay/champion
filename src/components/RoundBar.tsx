"use client";

import { useEffect, useState } from "react";
import { startRound } from "@/app/actions/match";

type Props = {
  code: string;
  isHost: boolean;
  totalRounds: number;
  roundsPlayed: number;
  currentRound: number | null;
  startedAt: string | null;
  endedAt: string | null;
  difficulty: string | null;
  canStart: boolean;
};

// Counts up from the round's start. The start time comes from the SERVER, so
// every player's clock shows the same elapsed time regardless of when their
// page loaded or how far off their laptop clock is.
function Timer({ startedAt, endedAt }: { startedAt: string; endedAt: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endedAt) return; // round is over, stop ticking
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [endedAt]);

  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : now;
  const ms = Math.max(0, end - start);

  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const tenths = Math.floor((ms % 1000) / 100);

  return (
    <span
      className={`font-mono text-2xl tabular-nums ${
        endedAt ? "text-chalk-dim" : "text-flood"
      }`}
    >
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      <span className="text-base opacity-60">.{tenths}</span>
    </span>
  );
}

export function RoundBar({
  code,
  isHost,
  totalRounds,
  roundsPlayed,
  currentRound,
  startedAt,
  endedAt,
  difficulty,
  canStart,
}: Props) {
  const allDone = roundsPlayed >= totalRounds && !startedAt;
  const nextRound = Math.min(roundsPlayed + 1, totalRounds);

  return (
    <section className="mb-4 flex flex-wrap items-center gap-4 rounded-lg border border-ink-line bg-ink-raised px-4 py-3">
      <div>
        <p className="font-mono text-[10px] tracking-[0.2em] text-chalk-dim">
          ROUND
        </p>
        <p className="font-mono text-lg text-chalk">
          {currentRound ?? roundsPlayed}
          <span className="text-chalk-dim"> / {totalRounds}</span>
        </p>
      </div>

      <div className="border-l border-ink-line pl-4">
        <p className="font-mono text-[10px] tracking-[0.2em] text-chalk-dim">
          TIME
        </p>
        {startedAt ? (
          <Timer startedAt={startedAt} endedAt={endedAt} />
        ) : (
          <span className="font-mono text-2xl tabular-nums text-chalk-dim">
            00:00<span className="text-base opacity-60">.0</span>
          </span>
        )}
      </div>

      {!isHost && !startedAt && !allDone && (
        <p className="ml-auto font-mono text-xs text-chalk-dim">
          waiting for the host to start round {nextRound}
        </p>
      )}

      {allDone && (
        <p className="ml-auto font-mono text-xs text-flood">
          all {totalRounds} rounds complete
        </p>
      )}

      {isHost && !allDone && (
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {canStart && (
            <form action={startRound}>
              <input type="hidden" name="code" value={code} />
              <button
                type="submit"
                className="rounded bg-flood px-5 py-2 font-mono text-xs font-medium text-ink transition-opacity hover:opacity-90"
              >
                start round {nextRound}
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
