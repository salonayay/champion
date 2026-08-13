"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function chooseProblem(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;

  const code = String(formData.get("code") ?? "");
  const problemId = String(formData.get("problemId") ?? "");
  const random = formData.get("random") === "1";

  const room = await prisma.room.findUnique({
    where: { code },
    include: { members: true },
  });
  if (!room) return;

  // The host check happens HERE, on the server -- not by hiding the button.
  // Hiding it in the UI is a courtesy; this is the actual rule.
  if (room.hostId !== session.user.id) return;

  let chosenId = problemId;

  if (random || !chosenId) {
    const count = await prisma.problem.count();
    if (count === 0) return;
    const [problem] = await prisma.problem.findMany({
      take: 1,
      skip: Math.floor(Math.random() * count),
    });
    if (!problem) return;
    chosenId = problem.id;
  }

  await prisma.match.updateMany({
    where: { roomId: room.id, status: { in: ["PENDING", "LIVE"] } },
    data: { status: "ABANDONED", endedAt: new Date() },
  });

  await prisma.match.create({
    data: {
      roomId: room.id,
      problemId: chosenId,
      status: "LIVE",
      startedAt: new Date(),
      participants: {
        create: room.members.map((m) => ({ userId: m.userId })),
      },
    },
  });

  revalidatePath(`/room/${code}`);
}
