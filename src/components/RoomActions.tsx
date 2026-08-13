"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createRoom, joinRoom, type ActionResult } from "@/app/actions/rooms";

function SubmitButton({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  const base =
    "rounded-md px-6 py-3 font-medium transition-opacity disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-flood text-ink hover:opacity-90"
      : "border border-ink-line text-chalk hover:border-flood";

  return (
    <button type="submit" disabled={pending} className={`${base} ${styles}`}>
      {pending ? "Working..." : children}
    </button>
  );
}

export function RoomActions() {
  const [setupOpen, setSetupOpen] = useState(false);

  const [joinState, joinAction] = useActionState<ActionResult, FormData>(
    joinRoom,
    undefined,
  );
  const [createState, createAction] = useActionState<ActionResult, FormData>(
    async (_prev, formData) => createRoom(formData),
    undefined,
  );

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => setSetupOpen(true)}
          className="rounded-md bg-flood px-6 py-3 font-medium text-ink transition-opacity hover:opacity-90"
        >
          Create a room
        </button>

        <form action={joinAction} className="flex gap-2">
          <input
            name="code"
            type="text"
            placeholder="Room code"
            aria-label="Room code"
            maxLength={6}
            autoComplete="off"
            className="w-40 rounded-md border border-ink-line bg-ink-raised px-4 py-3 font-mono uppercase tracking-widest text-chalk placeholder:tracking-normal placeholder:text-chalk-dim"
          />
          <SubmitButton variant="secondary">Join</SubmitButton>
        </form>
      </div>

      {joinState?.error && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {joinState.error}
        </p>
      )}

      {setupOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSetupOpen(false)}
        >
          {/* stopPropagation so clicking inside the panel doesn't close it */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-lg border border-ink-line bg-ink-raised p-6"
          >
            <h2 className="mb-1 font-mono text-xs tracking-[0.2em] text-chalk-dim">
              NEW ROOM
            </h2>
            <p className="mb-6 text-sm text-chalk-dim">
              These are locked in once the room is created.
            </p>

            <form action={createAction} className="space-y-4">
              <label className="block">
                <span className="mb-1 block font-mono text-[11px] text-chalk-dim">
                  rounds
                </span>
                <input
                  name="totalRounds"
                  type="number"
                  min={1}
                  max={10}
                  defaultValue={3}
                  className="w-full rounded border border-ink-line bg-ink px-3 py-2 font-mono text-sm text-chalk"
                />
              </label>

              <label className="block">
                <span className="mb-1 block font-mono text-[11px] text-chalk-dim">
                  difficulty
                </span>
                <select
                  name="difficulty"
                  defaultValue=""
                  className="w-full rounded border border-ink-line bg-ink px-3 py-2 font-mono text-sm text-chalk"
                >
                  <option value="">any</option>
                  <option value="EASY">easy</option>
                  <option value="MEDIUM">medium</option>
                  <option value="HARD">hard</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block font-mono text-[11px] text-chalk-dim">
                  players (including you)
                </span>
                <input
                  name="maxSeats"
                  type="number"
                  min={2}
                  max={5}
                  defaultValue={5}
                  className="w-full rounded border border-ink-line bg-ink px-3 py-2 font-mono text-sm text-chalk"
                />
              </label>

              <div>
                <span className="mb-1 block font-mono text-[11px] text-chalk-dim">
                  starts at (optional)
                </span>
                <div className="flex gap-2">
                  <input
                    name="startDate"
                    type="date"
                    className="flex-1 rounded border border-ink-line bg-ink px-3 py-2 font-mono text-sm text-chalk"
                  />
                  <input
                    name="startHour"
                    type="number"
                    min={1}
                    max={12}
                    defaultValue={12}
                    aria-label="Hour"
                    placeholder="hh"
                    className="w-16 rounded border border-ink-line bg-ink px-2 py-2 text-center font-mono text-sm text-chalk"
                  />
                  <input
                    name="startMinute"
                    type="number"
                    min={0}
                    max={59}
                    defaultValue={0}
                    aria-label="Minute"
                    placeholder="mm"
                    className="w-16 rounded border border-ink-line bg-ink px-2 py-2 text-center font-mono text-sm text-chalk"
                  />
                  <select
                    name="startMeridiem"
                    defaultValue="PM"
                    aria-label="AM or PM"
                    className="rounded border border-ink-line bg-ink px-2 py-2 font-mono text-sm text-chalk"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
                <span className="mt-1 block text-[11px] text-chalk-dim">
                  Leave the date empty to open immediately. Nobody can enter
                  before this time, including you.
                </span>
              </div>

              {createState?.error && (
                <p role="alert" className="text-sm text-red-400">
                  {createState.error}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <SubmitButton variant="primary">Create room</SubmitButton>
                <button
                  type="button"
                  onClick={() => setSetupOpen(false)}
                  className="rounded-md border border-ink-line px-4 py-3 text-sm text-chalk-dim hover:border-flood hover:text-chalk"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
