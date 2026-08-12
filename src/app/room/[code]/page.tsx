import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { addMemberToRoom, leaveRoom } from "@/app/actions/rooms";
import { RoomWorkspaces } from "@/components/RoomWorkspaces";

// In Next.js 15, params arrives as a Promise, so it has to be awaited.
// This page lives at src/app/room/[code]/page.tsx — the [code] folder is what
// makes /room/K7Q2XM work for any code, with the value handed to us here.

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();

  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const room = await prisma.room.findUnique({
    where: { code },
    include: {
      // Pull the members AND each member's user record in one query. Without
      // the nested include we'd have their ids but not their names, and we'd
      // need a second query per member — the "N+1 query" problem.
      members: {
        include: { user: { select: { username: true, image: true } } },
        orderBy: { seat: "asc" },
      },
      host: { select: { username: true } },
    },
  });

  if (!room) notFound(); // renders Next.js's 404 page

  const me = room.members.find((m) => m.userId === session.user.id);

  // Arrived via a shared link but not a member yet — show a join screen.
  if (!me) {
    const full = room.members.length >= room.maxSeats;

    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="font-mono text-xs tracking-[0.3em] text-chalk-dim">
          ROOM
        </p>
        <h1
          className="mt-2 font-mono text-4xl tracking-[0.2em] text-flood"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {room.code}
        </h1>
        <p className="mt-4 text-chalk-dim">
          Hosted by {room.host.username ?? "someone"} &middot;{" "}
          {room.members.length} of {room.maxSeats} seats taken
        </p>

        {full ? (
          <p className="mt-8 text-red-400">This room is full.</p>
        ) : (
          <form
            action={async () => {
              "use server";
              await addMemberToRoom(code, session.user.id);
              redirect(`/room/${code}`);
            }}
            className="mt-8"
          >
            <button
              type="submit"
              className="rounded-md bg-flood px-6 py-3 font-medium text-ink hover:opacity-90"
            >
              Join this room
            </button>
          </form>
        )}

        <Link
          href="/"
          className="mt-6 inline-block text-sm text-chalk-dim hover:text-chalk"
        >
          Back home
        </Link>
      </main>
    );
  }

  // Build a fixed array of seats so empty ones render as placeholders rather
  // than the grid collapsing to however many people happen to be present.
  const seats = Array.from({ length: room.maxSeats }, (_, i) => {
    return room.members.find((m) => m.seat === i) ?? null;
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-chalk-dim">
            ROOM CODE
          </p>
          <h1 className="mt-1 font-mono text-4xl tracking-[0.25em] text-flood">
            {room.code}
          </h1>
          <p className="mt-2 text-sm text-chalk-dim">
            Share this code. {room.members.length} of {room.maxSeats} seats
            taken.
          </p>
        </div>

        <form action={leaveRoom}>
          <input type="hidden" name="code" value={room.code} />
          <button
            type="submit"
            className="rounded-md border border-ink-line px-4 py-2 text-sm text-chalk-dim transition-colors hover:border-red-400 hover:text-red-400"
          >
            Leave room
          </button>
        </form>
      </header>

      <RoomWorkspaces
        seats={seats.map((m, i) =>
          m
            ? {
                seat: i,
                userId: m.userId,
                username: m.user.username,
                image: m.user.image,
                isHost: m.userId === room.hostId,
              }
            : null,
        )}
        currentUserId={session.user.id}
      />

      <p className="mt-8 font-mono text-xs text-chalk-dim">
        Refresh to see who joined &mdash; live presence arrives in step 3b.
      </p>
    </main>
  );
}
