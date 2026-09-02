import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// A server component, so it can hit the database directly -- no API route, no
// loading state, no client-side fetch. It renders as part of the page.
export async function UserBadge() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true, rating: true, image: true },
  });
  if (!user) return null;

  return (
    <Link
      href={`/profile/${user.username}`}
      className="fixed right-4 top-4 z-40 flex items-center gap-3 rounded-full border border-ink-line bg-ink-raised px-3 py-1.5 transition-colors hover:border-flood"
    >
      {user.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.image} alt="" width={22} height={22} className="rounded-full" />
      )}
      <span className="font-mono text-xs text-chalk">{user.username}</span>
      <span className="font-mono text-xs text-flood">{user.rating}</span>
    </Link>
  );
}
