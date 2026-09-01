"use client";

import { useState, useRef, useEffect } from "react";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Builds "YYYY-MM-DD" from the date's local parts. Using toISOString() here
// would convert to UTC first, which can shift the date by a day depending on
// the timezone -- picking the 13th and storing the 12th.
function toDateString(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function DatePicker({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Date | null>(null);

  // Null until the browser mounts. Calling new Date() during render would give
  // the server one date and the client another, which React flags as a
  // hydration mismatch.
  const [today, setToday] = useState<Date | null>(null);
  const [viewMonth, setViewMonth] = useState<Date | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const now = startOfDay(new Date());
    setToday(now);
    setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  }, []);

  // Close when clicking anywhere outside the picker.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!today || !viewMonth) {
    return (
      <div className="w-full rounded border border-ink-line bg-ink px-3 py-2 font-mono text-sm text-chalk-dim">
        select date
      </div>
    );
  }

  // Two months ahead, inclusive of that whole month's days.
  const maxDate = startOfDay(
    new Date(today.getFullYear(), today.getMonth() + 2, today.getDate()),
  );

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();

  // Day of week the 1st lands on, so we know how many blanks to draw first.
  const leadingBlanks = new Date(year, month, 1).getDay();

  // Day 0 of the NEXT month is the last day of this one -- a neat way to get
  // the length of any month without a lookup table or leap-year special case.
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const canGoBack =
    year > today.getFullYear() ||
    (year === today.getFullYear() && month > today.getMonth());

  const canGoForward =
    year < maxDate.getFullYear() ||
    (year === maxDate.getFullYear() && month < maxDate.getMonth());

  function pick(day: number) {
    const d = new Date(year, month, day);
    setSelected(d);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      {/* The real value the form submits. */}
      <input
        type="hidden"
        name={name}
        value={selected ? toDateString(selected) : ""}
      />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded border border-ink-line bg-ink px-3 py-2 text-left font-mono text-sm text-chalk hover:border-flood"
      >
        {selected
          ? selected.toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : <span className="text-chalk-dim">select date</span>}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-ink-line bg-ink-raised p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-sm text-chalk">
              {MONTH_NAMES[month]} {year}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={!canGoBack}
                onClick={() => setViewMonth(new Date(year, month - 1, 1))}
                aria-label="Previous month"
                className="rounded px-2 py-0.5 font-mono text-sm text-chalk-dim hover:text-chalk disabled:opacity-25 disabled:hover:text-chalk-dim"
              >
                &lsaquo;
              </button>
              <button
                type="button"
                disabled={!canGoForward}
                onClick={() => setViewMonth(new Date(year, month + 1, 1))}
                aria-label="Next month"
                className="rounded px-2 py-0.5 font-mono text-sm text-chalk-dim hover:text-chalk disabled:opacity-25 disabled:hover:text-chalk-dim"
              >
                &rsaquo;
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {DAY_LABELS.map((label, i) => (
              <div
                key={i}
                className="py-1 text-center font-mono text-[10px] text-chalk-dim"
              >
                {label}
              </div>
            ))}

            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}

            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const d = new Date(year, month, day);
              const disabled = d < today || d > maxDate;
              const isSelected = selected ? sameDay(d, selected) : false;
              const isToday = sameDay(d, today);

              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(day)}
                  className={`aspect-square rounded-full font-mono text-xs transition-colors ${
                    isSelected
                      ? "bg-flood font-medium text-ink"
                      : disabled
                        ? "text-chalk-dim/25"
                        : isToday
                          ? "text-flood hover:bg-ink-line"
                          : "text-chalk hover:bg-ink-line"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {selected && (
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setOpen(false);
              }}
              className="mt-2 w-full rounded border border-ink-line py-1 font-mono text-[10px] text-chalk-dim hover:border-flood hover:text-chalk"
            >
              clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
