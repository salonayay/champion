import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

// This file is the whole authentication setup. It exports four things the rest
// of the app uses:
//
//   handlers — the URLs Google redirects back to
//   auth     — "who is signed in right now?"
//   signIn   — starts the Google flow
//   signOut  — ends the session

export const { handlers, auth, signIn, signOut } = NextAuth({
  // The adapter is the bridge between Auth.js and your database. Without it,
  // sessions would live in a cookie and vanish. With it, every sign-in writes
  // real rows to User, Account, and Session.
  adapter: PrismaAdapter(prisma),

  // Google reads AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET from .env automatically.
  providers: [Google],

  callbacks: {
    // By default the session tells you a user's name and email but not their
    // database id. We need the id constantly — to say who hosts a room, who
    // submitted what — so we attach it here.
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },

  events: {
    // Runs once, the first time someone ever signs in.
    //
    // Google gives us a name and an email but no username. We derive one from
    // the email — priya.sharma@gmail.com becomes "priyasharma" — and if that's
    // taken, we append a number until it isn't. The database has a unique
    // constraint on username, so a duplicate would throw an error.
    async createUser({ user }) {
      const base =
        user.email?.split("@")[0]?.replace(/[^a-z0-9]/gi, "").toLowerCase() ||
        "player";

      let username = base;
      let suffix = 1;

      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${base}${suffix}`;
        suffix++;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { username },
      });
    },
  },

  pages: {
    signIn: "/", // no separate login page — the button lives on the homepage
  },
});
