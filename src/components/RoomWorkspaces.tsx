"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { LANGUAGES, LANGUAGE_KEYS, type LanguageKey } from "@/lib/languages";
import { runSamples, submitSolution, type RunOutcome } from "@/app/actions/submit";
import { useRoomSocket, type LiveAttempt } from "@/lib/useRoomSocket";

const CodeEditor = dynamic(() => import("@/components/CodeEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <span className="font-mono text-xs text-chalk-dim">loading...</span>
    </div>
  ),
});

export type SeatOccupant = {
  seat: number;
  userId: string;
  username: string | null;
  image: string | null;
  isHost: boolean;
};

type Props = {
  seats: (SeatOccupant | null)[];
  currentUserId: string;
  roomCode: string;
  matchId: string | null;
  problemId: string | null;
  winnerName: string | null;
  attempts: Record<string, LiveAttempt>;
};

const MIN_WIDTH = 380;
const MIN_REMAINING = 220;

const VERDICT_LABEL: Record<string, string> = {
  ACCEPTED: "accepted",
  WRONG_ANSWER: "wrong answer",
  TIME_LIMIT_EXCEEDED: "time limit exceeded",
  RUNTIME_ERROR: "runtime error",
  COMPILE_ERROR: "compile error",
};

export function RoomWorkspaces({
  seats,
  currentUserId,
  roomCode,
  matchId,
  problemId,
  winnerName,
  attempts,
}: Props) {
  const [language, setLanguage] = useState<LanguageKey>("PYTHON");
  const [code, setCode] = useState<string>(LANGUAGES.PYTHON.starter);
  const [panelWidth, setPanelWidth] = useState(760);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState<null | "run" | "submit">(null);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [myAttemptCount, setMyAttemptCount] = useState(
    attempts[currentUserId]?.attemptNumber ?? 0,
  );

  const scrollerRef = useRef<HTMLDivElement>(null);

  const mine = seats.find((s) => s?.userId === currentUserId) ?? null;
  const others = seats.filter((s) => s?.userId !== currentUserId);

  const {
    connected,
    peers,
    liveCode,
    liveAttempts,
    winner: liveWinner,
    publishCode,
    publishAttempt,
    publishWin,
  } = useRoomSocket({
    roomCode,
    userId: currentUserId,
    username: mine?.username ?? null,
    image: mine?.image ?? null,
    seat: mine?.seat ?? 0,
  });

  const onlineIds = new Set(peers.map((p) => p.userId));

  function handleCodeChange(next: string) {
    setCode(next);
    publishCode(next, language);
  }

  function changeLanguage(next: LanguageKey) {
    const untouched = code.trim() === LANGUAGES[language].starter.trim();
    setLanguage(next);
    if (untouched) {
      setCode(LANGUAGES[next].starter);
      publishCode(LANGUAGES[next].starter, next);
    } else {
      publishCode(code, next);
    }
  }

  function startDrag(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || !scrollerRef.current) return;
    const rect = scrollerRef.current.getBoundingClientRect();
    const next = e.clientX - rect.left;
    const max = Math.max(MIN_WIDTH, rect.width - MIN_REMAINING);
    setPanelWidth(Math.min(Math.max(next, MIN_WIDTH), max));
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    setDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  // Tell the room how an attempt went, so everyone's badge updates at once.
  function announce(result: RunOutcome, kind: "RUN" | "SUBMIT") {
    const n = myAttemptCount + 1;
    setMyAttemptCount(n);
    publishAttempt({
      kind,
      verdict: result.verdict,
      passedCount: result.cases.filter((c) => c.verdict === "ACCEPTED").length,
      totalCount: result.cases.length,
      attemptNumber: n,
    });
    if (result.wonMatch) publishWin();
  }

  async function handleRun() {
    if (!problemId) return;
    setBusy("run");
    setOutcome(null);
    const result = await runSamples({
      problemId,
      source: code,
      language,
      matchId,
      roomCode,
    });
    setOutcome(result);
    announce(result, "RUN");
    setBusy(null);
  }

  async function handleSubmit() {
    if (!matchId) return;
    setBusy("submit");
    setOutcome(null);
    const result = await submitSolution({ matchId, source: code, language, roomCode });
    setOutcome(result);
    announce(result, "SUBMIT");
    setBusy(null);
  }

  const shownWinner = liveWinner ?? winnerName;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-mono text-xs tracking-[0.2em] text-chalk-dim">
            WORKSPACES
          </h2>
          <span
            className={`flex items-center gap-1.5 font-mono text-[10px] ${
              connected ? "text-verdict" : "text-chalk-dim"
            }`}
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                connected ? "bg-verdict" : "bg-chalk-dim"
              }`}
            />
            {connected ? `${peers.length} online` : "offline"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-chalk-dim">
            <span className="font-mono">language</span>
            <select
              value={language}
              onChange={(e) => changeLanguage(e.target.value as LanguageKey)}
              className="rounded border border-ink-line bg-ink-raised px-2 py-1 font-mono text-xs text-chalk"
            >
              {LANGUAGE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {LANGUAGES[key].label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={handleRun}
            disabled={!problemId || busy !== null}
            className="rounded border border-ink-line px-4 py-1.5 font-mono text-xs text-chalk transition-colors hover:border-flood disabled:opacity-40"
          >
            {busy === "run" ? "running..." : "run samples"}
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!matchId || busy !== null}
            className="rounded bg-flood px-4 py-1.5 font-mono text-xs text-ink transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy === "submit" ? "judging..." : "submit"}
          </button>
        </div>
      </div>

      {shownWinner && (
        <div className="mb-3 rounded border border-verdict/40 bg-verdict/10 px-4 py-2 font-mono text-xs text-verdict">
          {shownWinner} won this round
        </div>
      )}

      {outcome && <ResultStrip outcome={outcome} />}

      <div
        ref={scrollerRef}
        className={`flex gap-3 overflow-x-auto pb-3 ${dragging ? "select-none" : ""}`}
      >
        {mine && (
          <div
            style={{ width: panelWidth }}
            className="relative sticky left-0 z-20 shrink-0 overflow-hidden rounded-lg border border-flood/50 bg-ink-raised shadow-[10px_0_20px_-10px_rgba(0,0,0,0.7)]"
          >
            <PanelHeader
              occupant={mine}
              seatIndex={mine.seat}
              isMine
              online
              languageLabel={LANGUAGES[language].label}
            />
            <AttemptBadge attempt={liveAttempts[mine.userId] ?? attempts[mine.userId]} />
            <div className="h-[58vh] min-h-[340px]">
              <CodeEditor value={code} language={language} onChange={handleCodeChange} />
            </div>

            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize your workspace"
              onPointerDown={startDrag}
              onPointerMove={onDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              className={`absolute right-0 top-0 h-full w-2 cursor-col-resize transition-colors ${
                dragging ? "bg-flood" : "bg-transparent hover:bg-flood/40"
              }`}
            />
          </div>
        )}

        {others.map((occupant, i) => {
          const live = occupant ? liveCode[occupant.userId] : undefined;
          const theirLanguage = (live?.language as LanguageKey) ?? "PYTHON";

          return (
            <div
              key={occupant?.userId ?? `empty-${i}`}
              style={{ width: panelWidth }}
              className={`shrink-0 overflow-hidden rounded-lg border ${
                occupant
                  ? "border-ink-line bg-ink-raised"
                  : "border-dashed border-ink-line/60"
              }`}
            >
              <PanelHeader
                occupant={occupant}
                seatIndex={occupant?.seat ?? i}
                online={occupant ? onlineIds.has(occupant.userId) : false}
                languageLabel={
                  occupant ? LANGUAGES[theirLanguage].label : "empty"
                }
              />
              {occupant && (
                <AttemptBadge
                  attempt={liveAttempts[occupant.userId] ?? attempts[occupant.userId]}
                />
              )}
              <div className="h-[58vh] min-h-[340px]">
                {occupant && live ? (
                  <CodeEditor value={live.code} language={theirLanguage} readOnly />
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center">
                    <span className="font-mono text-xs text-chalk-dim">
                      {occupant ? "hasn't started typing" : "waiting for a player"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AttemptBadge({ attempt }: { attempt?: LiveAttempt }) {
  if (!attempt) {
    return (
      <div className="border-b border-ink-line px-3 py-1.5 font-mono text-[10px] text-chalk-dim">
        no attempts yet
      </div>
    );
  }

  const passed = attempt.passedCount ?? 0;
  const total = attempt.totalCount ?? 0;
  const good = attempt.verdict === "ACCEPTED";

  return (
    <div
      className={`flex items-center gap-2 border-b px-3 py-1.5 font-mono text-[10px] ${
        good
          ? "border-verdict/30 bg-verdict/10 text-verdict"
          : "border-red-400/30 bg-red-400/10 text-red-400"
      }`}
    >
      <span className="font-medium">{passed} / {total} passed</span>
      <span className="opacity-80">
        {(VERDICT_LABEL[attempt.verdict] ?? attempt.verdict).toLowerCase()}
      </span>
      <span className="ml-auto text-chalk-dim">
        {attempt.kind === "RUN" ? "run" : "submit"} &middot; attempt {attempt.attemptNumber}
      </span>
    </div>
  );
}

function ResultStrip({ outcome }: { outcome: RunOutcome }) {
  const good = outcome.verdict === "ACCEPTED";

  return (
    <div
      className={`mb-3 rounded border px-4 py-3 ${
        good ? "border-verdict/40 bg-verdict/10" : "border-red-400/40 bg-red-400/10"
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className={`font-mono text-xs ${good ? "text-verdict" : "text-red-400"}`}>
          {VERDICT_LABEL[outcome.verdict] ?? outcome.verdict.toLowerCase()}
        </span>
        <span className="font-mono text-[11px] text-chalk-dim">
          {outcome.cases.filter((c) => c.verdict === "ACCEPTED").length} of{" "}
          {outcome.cases.length} passed
        </span>
        {outcome.wonMatch && (
          <span className="font-mono text-[11px] text-flood">you won this round</span>
        )}
      </div>

      {outcome.message && (
        <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-chalk-dim">
          {outcome.message}
        </pre>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        {outcome.cases.map((c) => (
          <span
            key={c.index}
            className={`rounded px-2 py-0.5 font-mono text-[10px] ${
              c.verdict === "ACCEPTED"
                ? "bg-verdict/20 text-verdict"
                : "bg-red-400/20 text-red-400"
            }`}
          >
            {c.hidden ? `hidden ${c.index + 1}` : `sample ${c.index + 1}`}
            {c.timeMs != null && ` · ${c.timeMs}ms`}
          </span>
        ))}
      </div>

      {outcome.cases
        .filter((c) => !c.hidden && c.verdict !== "ACCEPTED")
        .map((c) => (
          <div key={`fail-${c.index}`} className="mt-2 grid gap-1 text-[11px]">
            <span className="font-mono text-chalk-dim">input</span>
            <pre className="whitespace-pre-wrap font-mono text-chalk">{c.input}</pre>
            <span className="font-mono text-chalk-dim">expected</span>
            <pre className="whitespace-pre-wrap font-mono text-verdict">{c.expected}</pre>
            <span className="font-mono text-chalk-dim">you printed</span>
            <pre className="whitespace-pre-wrap font-mono text-red-400">
              {c.got ?? "(nothing)"}
            </pre>
          </div>
        ))}
    </div>
  );
}

function PanelHeader({
  occupant,
  seatIndex,
  isMine = false,
  online,
  languageLabel,
}: {
  occupant: SeatOccupant | null;
  seatIndex: number;
  isMine?: boolean;
  online: boolean;
  languageLabel: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-ink-line px-3 py-2">
      {occupant?.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={occupant.image}
          alt=""
          width={20}
          height={20}
          className={`rounded-full ${online ? "" : "opacity-40 grayscale"}`}
        />
      )}
      <span className={`font-mono text-xs ${online ? "text-chalk" : "text-chalk-dim"}`}>
        {occupant?.username ?? `seat ${seatIndex}`}
      </span>
      {occupant?.isHost && <span className="font-mono text-[10px] text-flood">host</span>}
      {isMine && <span className="font-mono text-[10px] text-chalk-dim">you</span>}
      {occupant && !online && (
        <span className="font-mono text-[10px] text-chalk-dim">away</span>
      )}
      <span className="ml-auto font-mono text-[10px] text-chalk-dim">{languageLabel}</span>
    </div>
  );
}
