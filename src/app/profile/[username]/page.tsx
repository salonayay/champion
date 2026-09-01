import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";

const DIFF_COLOR: Record<string, string> = {
  EASY: "#16a34a",
  MEDIUM: "#ca8a04",
  HARD: "#dc2626",
};

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      rating: true,
      createdAt: true,
    },
  });

  if (!user) notFound();

  const history = await prisma.ratingChange.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      match: {
        select: {
          roundNumber: true,
          winnerId: true,
          endedAt: true,
          problem: { select: { title: true, slug: true, difficulty: true } },
        },
      },
    },
  });

  const wins = history.filter((h) => h.match.winnerId === user.id).length;
  const played = history.length;
  const peak = Math.max(1200, ...history.map((h) => h.ratingAfter));
  const winRate = played ? Math.round((wins / played) * 100) : 0;

  const stats = [
    { label: "Rating", value: user.rating },
    { label: "Peak", value: peak },
    { label: "Matches", value: played },
    { label: "Wins", value: wins },
    { label: "Win rate", value: played ? winRate + "%" : "—" },
  ];

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {user.image ? (
          <Image
            src={user.image}
            alt=""
            width={64}
            height={64}
            style={{ borderRadius: "50%" }}
          />
        ) : null}
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>
            {user.name ?? user.username}
          </h1>
          <p style={{ margin: "4px 0 0", opacity: 0.6, fontSize: 14 }}>
            @{user.username} · joined{" "}
            {user.createdAt.toLocaleDateString("en-IN", {
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 12,
          margin: "28px 0",
        }}
      >
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              border: "1px solid rgba(128,128,128,0.25)",
              borderRadius: 10,
              padding: "14px 16px",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, marginTop: 2 }}>
              {s.value}
            </div>
          </div>
        ))}
      </section>

      <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 12 }}>
        Match history
      </h2>

      {played === 0 ? (
        <p style={{ opacity: 0.6, fontSize: 14 }}>No rated matches yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", opacity: 0.6, fontSize: 12 }}>
                <th style={{ padding: "8px 10px" }}>Date</th>
                <th style={{ padding: "8px 10px" }}>Problem</th>
                <th style={{ padding: "8px 10px" }}>Difficulty</th>
                <th style={{ padding: "8px 10px" }}>Result</th>
                <th style={{ padding: "8px 10px", textAlign: "right" }}>Change</th>
                <th style={{ padding: "8px 10px", textAlign: "right" }}>Rating</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => {
                const won = h.match.winnerId === user.id;
                return (
                  <tr
                    key={h.id}
                    style={{ borderTop: "1px solid rgba(128,128,128,0.2)" }}
                  >
                    <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
                      {h.createdAt.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td style={{ padding: "10px" }}>{h.match.problem.title}</td>
                    <td
                      style={{
                        padding: "10px",
                        color: DIFF_COLOR[h.match.problem.difficulty],
                        fontWeight: 600,
                        fontSize: 12,
                      }}
                    >
                      {h.match.problem.difficulty}
                    </td>
                    <td style={{ padding: "10px", fontWeight: 600 }}>
                      {won ? "Win" : "Loss"}
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        textAlign: "right",
                        fontWeight: 600,
                        color: h.delta >= 0 ? "#16a34a" : "#dc2626",
                      }}
                    >
                      {h.delta > 0 ? "+" : ""}
                      {h.delta}
                    </td>
                    <td style={{ padding: "10px", textAlign: "right", opacity: 0.7 }}>
                      {h.ratingAfter}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
