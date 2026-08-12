import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import WorkspaceGrid from "@/components/WorkspaceGrid";
import { SignInButton, SignOutButton } from "@/components/AuthButtons";

// `async` on a page component means this runs on the SERVER before anything is
// sent to the browser. That's why we can query the database directly here --
// this code never reaches the user's machine.

export default async function Home() {
  const session = await auth();

  // Only look up the profile if someone is actually signed in.
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { username: true, rating: true, image: true, name: true },
      })
    : null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-14">
        <div className="mb-6 flex items-center justify-between">
          <p className="font-mono text-xs tracking-[0.3em] text-flood">BETA</p>
          {user && <SignOutButton />}
        </div>

        <h1
          className="text-5xl font-bold tracking-tight sm:text-7xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          CHAMPION
        </h1>
        <p className="mt-5 max-w-md text-lg leading-relaxed text-chalk-dim">
          Everyone gets their own workspace. Everyone sees everyone else&rsquo;s
          screen. First correct submission wins.
        </p>
      </header>

      <section className="mb-16">
        {user ? (
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-ink-line bg-ink-raised p-4">
            {user.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt=""
                width={44}
                height={44}
                className="rounded-full"
              />
            )}
            <div className="mr-auto">
              <p className="font-mono text-sm text-chalk">{user.username}</p>
              <p className="text-xs text-chalk-dim">
                rating {user.rating} &middot; unranked
              </p>
            </div>
            <p className="font-mono text-xs text-chalk-dim">
              rooms arrive in step 2b
            </p>
          </div>
        ) : (
          <div>
            <SignInButton />
            <p className="mt-3 text-sm text-chalk-dim">
              Sign in to create a room.
            </p>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-mono text-xs tracking-[0.2em] text-chalk-dim">
          A ROOM IN PROGRESS
        </h2>
        <WorkspaceGrid />
      </section>
    </main>
  );
}
