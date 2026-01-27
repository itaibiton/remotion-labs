"use client";

import { useMutation } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect } from "react";
import { UserMenu } from "@/components/auth/user-menu";
import Link from "next/link";

function CreateContent() {
  const storeUser = useMutation(api.users.storeUser);

  // Store user in Convex on first visit (handles both new signups and existing users)
  useEffect(() => {
    storeUser().catch(console.error);
  }, [storeUser]);

  return (
    <div className="p-6">
      <p className="text-lg text-gray-600 mb-4">
        You&apos;re signed in! This is where the prompt input will go in Phase 2.
      </p>
      <div className="p-4 bg-gray-100 rounded-lg">
        <p className="text-sm text-gray-500">
          Placeholder for animation generation interface
        </p>
      </div>
    </div>
  );
}

export default function CreatePage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <Link href="/" className="text-xl font-bold">
          RemotionLab
        </Link>
        <UserMenu />
      </header>

      {/* Content */}
      <div className="flex-1">
        <AuthLoading>
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Loading...</p>
          </div>
        </AuthLoading>

        <Unauthenticated>
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Redirecting to sign in...</p>
          </div>
        </Unauthenticated>

        <Authenticated>
          <CreateContent />
        </Authenticated>
      </div>
    </main>
  );
}
