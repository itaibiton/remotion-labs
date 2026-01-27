import { SignedIn, SignedOut } from "@clerk/nextjs";
import { AuthButtons } from "@/components/auth/auth-buttons";
import { UserMenu } from "@/components/auth/user-menu";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <h1 className="text-xl font-bold">RemotionLab</h1>
        <nav className="flex items-center gap-4">
          <SignedIn>
            <Link
              href="/create"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              Create Animation
            </Link>
            <UserMenu />
          </SignedIn>
          <SignedOut>
            <AuthButtons />
          </SignedOut>
        </nav>
      </header>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <h2 className="text-4xl font-bold mb-4">
          Create Stunning Animations with AI
        </h2>
        <p className="text-lg text-gray-600 mb-8 max-w-2xl">
          Describe what you want, and watch it come to life. No coding or motion design skills required.
        </p>
        <SignedOut>
          <AuthButtons />
        </SignedOut>
        <SignedIn>
          <Link
            href="/create"
            className="px-6 py-3 text-lg font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
          >
            Start Creating
          </Link>
        </SignedIn>
      </div>
    </main>
  );
}
