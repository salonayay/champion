import { handlers } from "@/auth";

// This tiny file creates every authentication URL your app needs:
//   /api/auth/signin, /api/auth/callback/google, /api/auth/signout, and more.
//
// The folder name [...nextauth] is a "catch-all route" — the square brackets
// and dots tell Next.js to send ANY url starting with /api/auth/ here, no
// matter what comes after. Auth.js then works out which one was requested.

export const { GET, POST } = handlers;
