"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/broadcast";

// Only the host controls rounds. Every check below happens on the SERVER --
// hiding the buttons from non-hosts is a courtesy, this is the actual rule.
async function requireHost(code: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const room = await prisma.room.findUnique({
    where: { code },
    include: { members: true },
  });
  if (!room || room.hostId !== session.user.id) return null;

  return { room, userId: session.user.id };
}

export async function setRoundCount(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const ctx = await requireHost(code);
  if (!ctx) return;

  const raw = Number(formData.get("totalRounds"));
  const totalRounds = Math.min(10, Math.max(1, Math.round(raw) || 3));

  // Can't shrink below rounds already played.
  const played = await prisma.match.count({ where: { roomId: ctx.room.id } });
  if (totalRounds < played) return;

  await prisma.room.update({
    where: { id: ctx.room.id },
    data: { totalRounds },
  });

  revalidatePath(`/room/${code}`);
  await broadcast(code, "newRound");
}

export async function setDifficulty(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const ctx = await requireHost(code);
  if (!ctx) return;

  const value = String(formData.get("difficulty") ?? "");
  const difficulty =
    value === "EASY" || value === "MEDIUM" || value === "HARD" ? value : null;

  await prisma.room.update({
    where: { id: ctx.room.id },
    data: { difficulty },
  });

  revalidatePath(`/room/${code}`);
  await broadcast(code, "newRound");
}

export async function startRound(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const ctx = await requireHost(code);
  if (!ctx) return;
  const { room } = ctx;

  // Refuse to start while a round is still running.
  const live = await prisma.match.findFirst({
    where: { roomId: room.id, status: { in: ["PENDING", "LIVE"] } },
  });
  if (live) return;

  // A race needs someone to race against.
  if (room.members.length < 2) return;

  const played = await prisma.match.count({ where: { roomId: room.id } });
  if (played >= room.totalRounds) return; // all rounds done

  // Pick a problem matching the room's difficulty, avoiding anything already
  // used in this room -- nobody wants the same question twice.
  const used = await prisma.match.findMany({
    where: { roomId: room.id },
    select: { problemId: true },
  });
  const usedIds = used.map((m) => m.problemId);

  const where = {
    ...(room.difficulty ? { difficulty: room.difficulty } : {}),
    ...(usedIds.length ? { id: { notIn: usedIds } } : {}),
  };

  const count = await prisma.problem.count({ where });
  if (count === 0) return; // ran out of unused problems at this difficulty

  const [problem] = await prisma.problem.findMany({
    where,
    take: 1,
    skip: Math.floor(Math.random() * count),
  });
  if (!problem) return;

  // startedAt is stamped here, on the server. Every player's timer counts from
  // this one moment rather than from whenever their page happened to load.
  const match = await prisma.match.create({
    data: {
      roomId: room.id,
      problemId: problem.id,
      roundNumber: played + 1,
      status: "LIVE",
      startedAt: new Date(),
      participants: {
        create: room.members.map((m) => ({ userId: m.userId })),
      },
    },
  });

  await prisma.room.update({
    where: { id: room.id },
    data: { status: "IN_MATCH" },
  });

  revalidatePath(`/room/${code}`);
  await broadcast(code, "newRound", { roundNumber: match.roundNumber });
}
