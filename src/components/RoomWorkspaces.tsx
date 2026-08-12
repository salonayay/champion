"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { LANGUAGES, LANGUAGE_KEYS, type LanguageKey } from "@/lib/languages";

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
};

const MIN_WIDTH = 380;
const MIN_REMAINING = 220;

export function RoomWorkspaces({ seats, currentUserId }: Props) {
  const [language, setLanguage] = useState<LanguageKey>("PYTHON");
  const [code, setCode] = useState<string>(LANGUAGES.PYTHON.starter);
  const [panelWidth, setPanelWidth] = useState(760);
  const [dragging, setDragging] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);

  function changeLanguage(next: LanguageKey) {
    const untouched = code.trim() === LANGUAGES[language].starter.trim();
    setLanguage(next);
    if (untouched) setCode(LANGUAGES[next].starter);
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

  const mine = seats.find((s) => s?.userId === currentUserId) ?? null;
  const others = seats.filter((s) => s?.userId !== currentUserId);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="font-mono text-xs tracking-[0.2em] text-chalk-dim">
          WORKSPACES
        </h2>

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
      </div>

      <div
        ref={scrollerRef}
        className={`flex gap-3 overflow-x-auto pb-3 ${
          dragging ? "select-none" : ""
        }`}
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
              languageLabel={LANGUAGES[language].label}
            />
            <div className="h-[62vh] min-h-[380px]">
              <CodeEditor value={code} language={language} onChange={setCode} />
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

        {others.map((occupant, i) => (
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
              languageLabel={occupant ? LANGUAGES[language].label : "empty"}
            />
            <div className="flex h-[62vh] min-h-[380px] items-center justify-center px-6 text-center">
              <span className="font-mono text-xs text-chalk-dim">
                {occupant
                  ? "their code appears here once live sync is wired up"
                  : "waiting for a player"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-1 font-mono text-xs text-chalk-dim">
        Drag the right edge of your panel to resize &middot; scroll sideways for
        the others
      </p>
    </div>
  );
}

function PanelHeader({
  occupant,
  seatIndex,
  isMine = false,
  languageLabel,
}: {
  occupant: SeatOccupant | null;
  seatIndex: number;
  isMine?: boolean;
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
          className="rounded-full"
        />
      )}
      <span className="font-mono text-xs text-chalk">
        {occupant?.username ?? `seat ${seatIndex}`}
      </span>
      {occupant?.isHost && (
        <span className="font-mono text-[10px] text-flood">host</span>
      )}
      {isMine && (
        <span className="font-mono text-[10px] text-chalk-dim">you</span>
      )}
      <span className="ml-auto font-mono text-[10px] text-chalk-dim">
        {languageLabel}
      </span>
    </div>
  );
}
