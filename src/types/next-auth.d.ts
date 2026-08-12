import type { DefaultSession } from "next-auth";

// TypeScript doesn't know we added `id` to the session in auth.ts, so it would
// flag session.user.id as an error. This file tells it the field exists.
// Declaration files (.d.ts) describe shapes; they contain no running code.

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
