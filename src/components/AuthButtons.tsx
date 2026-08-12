import { signIn, signOut } from "@/auth";

// These are wrapped in <form> tags rather than onClick handlers on purpose.
//
// A button with onClick has to run in the browser. But signIn needs secrets
// that must never reach the browser. So instead the form posts back to the
// server, and the "use server" line marks that function as server-only code.
// This is called a Server Action.

export function SignInButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className="flex items-center gap-3 rounded-md bg-flood px-6 py-3 font-medium text-ink transition-opacity hover:opacity-90"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.94S8.78 6.3 12 6.3c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.68 3.74 14.53 2.8 12 2.8 6.94 2.8 2.85 6.89 2.85 12S6.94 21.2 12 21.2c5.27 0 8.76-3.7 8.76-8.92 0-.6-.06-1.05-.15-1.5z"
          />
        </svg>
        Continue with Google
      </button>
    </form>
  );
}

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className="rounded-md border border-ink-line px-4 py-2 text-sm text-chalk-dim transition-colors hover:border-flood hover:text-chalk"
      >
        Sign out
      </button>
    </form>
  );
}
