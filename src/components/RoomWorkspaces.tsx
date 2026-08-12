"use client";

import { useState } from "react";
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

const PANEL_WIDTH = "w-[min(640px,66vw)]";

export function RoomWorkspaces({ seats, currentUserId }: Props) {
  const [language, setLanguage] = useState<LanguageKey>("PYTHON");
  const [code, setCode] = useState<string>(LANGUAGES.PYTHON.starter);

  function changeLanguage(next: LanguageKey) {
    const untouched = code.trim() === LANGUAGES[language].starter.trim();
    setLanguage(next);
    if (untouched) setCode(LANGUAGES[next].starter);
  }

  const mine = seats.find((s) => s?.userId === currentUserId) ?? null;
  const others = seats.filter((s) => s?.userId !== currentUserId);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
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

      <div className="flex gap-3 overflow-x-auto pb-3">
        {mine && (
          <div
            className={`sticky left-0 z-20 shrink-0 ${PANEL_WIDTH} overflow-hidden rounded-lg border border-flood/50 bg-ink-raised shadow-[10px_0_20px_-10px_rgba(0,0,0,0.7)]`}
          >
            <PanelHeader
              occupant={mine}
              seatIndex={mine.seat}
              isMine
              languageLabel={LANGUAGES[language].label}
            />
            <div className="h-96">
              <CodeEditor value={code} language={language} onChange={setCode} />
            </div>
          </div>
        )}

        {others.map((occupant, i) => (
          <div
            key={occupant?.userId ?? `empty-${i}`}
            className={`shrink-0 ${PANEL_WIDTH} overflow-hidden rounded-lg border ${
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
            <div className="flex h-96 items-center justify-center px-6 text-center">
              <span className="font-mono text-xs text-chalk-dim">
                {occupant
                  ? "their code appears here once live sync is wired up"
                  : "waiting for a player"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-2 font-mono text-xs text-chalk-dim">
        Scroll sideways to see the others &middot; typing isn&rsquo;t shared yet
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
