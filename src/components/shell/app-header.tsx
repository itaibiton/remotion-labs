"use client";

import Link from "next/link";
import { UserMenu } from "@/components/auth/user-menu";

export function AppHeader() {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b bg-background">
      <Link href="/" className="text-xl font-bold">
        RemotionLab
      </Link>
      <UserMenu />
    </header>
  );
}
