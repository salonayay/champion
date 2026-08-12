"use client";

// "use client" means this component runs in the BROWSER.
//
// Why it has to: we want the error message to appear without a full page
// reload, and we want the button to show "Joining..." while it works. Both
// need browser-side state, which server components don't have.
//
// The actions it calls still run on the server — only this wrapper is
// client-side.

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createRoom, joinRoom, type ActionResult } from "@/app/actions/rooms";

// useFormStatus knows whether the surrounding form is currently submitting.
// It only works in a child of the form, which is why this is its own component.
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
  // useActionState connects a server action to component state.
  //   joinState — whatever the action returned (an error, or nothing)
  //   joinAction — pass this to the form's action prop
  const [joinState, joinAction] = useActionState<ActionResult, FormData>(
    joinRoom,
    undefined,
  );

  const [createState, createAction] = useActionState<ActionResult, FormData>(
    async () => createRoom(),
    undefined,
  );

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <form action={createAction}>
          <SubmitButton variant="primary">Create a room</SubmitButton>
        </form>

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

      {(joinState?.error || createState?.error) && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {joinState?.error ?? createState?.error}
        </p>
      )}
    </div>
  );
}
