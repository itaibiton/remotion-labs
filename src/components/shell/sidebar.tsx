"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Library, Film, Palette, Compass, FlaskConical, LogOut, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser, useClerk } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const navItems = [
  { href: "/library", label: "Library", icon: Library },
  { href: "/movie", label: "Movie", icon: Film },
  { href: "/templates", label: "Templates", icon: Palette },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();
  const pendingCount = useQuery(api.generations.countPending) ?? 0;

  const isFeedActive = pathname === "/feed" || pathname.startsWith("/feed");
  const isCreateActive = pathname === "/create" || pathname.startsWith("/create");

  return (
    <aside className="w-64 bg-sidebar flex flex-col p-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3.5 py-3 mb-4">
        <FlaskConical className="h-6 w-6 text-primary" />
        <span className="text-base font-semibold tracking-tight">RemotionLab</span>
      </div>

      {/* Feed Button */}
      <div className="w-full group mb-1.5">
        <Link
          href="/feed"
          className={cn(
            "flex relative w-full items-center gap-3 px-3 py-2 rounded-full text-base font-bold transition-all duration-100",
            isFeedActive
              ? "text-[oklch(0.72_0.19_195)]"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div
            className={cn(
              "absolute inset-0 rounded-full transition-all duration-200",
              isFeedActive
                ? "bg-[oklch(0.72_0.19_195)]/10 border border-[oklch(0.72_0.19_195)]/20 shadow-lg shadow-[oklch(0.72_0.19_195)]/10"
                : "bg-transparent border border-transparent group-hover:bg-muted"
            )}
          />
          {isFeedActive && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-tl from-background/50 to-transparent" />
          )}
          <Compass className="relative h-5 w-5" />
          <span className="relative">Feed</span>
        </Link>
      </div>

      {/* Create Button */}
      <div className="w-full group mb-3">
        <Link
          href="/create"
          className={cn(
            "flex relative w-full items-center gap-3 px-3 py-2 rounded-full text-base font-bold transition-all duration-100",
            isCreateActive
              ? "text-[oklch(0.72_0.19_195)]"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div
            className={cn(
              "absolute inset-0 rounded-full transition-all duration-200",
              isCreateActive
                ? "bg-[oklch(0.72_0.19_195)]/10 border border-[oklch(0.72_0.19_195)]/20 shadow-lg shadow-[oklch(0.72_0.19_195)]/10"
                : "bg-transparent border border-transparent group-hover:bg-muted"
            )}
          />
          {isCreateActive && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-tl from-background/50 to-transparent" />
          )}
          <Plus className="relative h-5 w-5" />
          <span className="relative flex-1">Create</span>
          {pendingCount > 0 && (
            <span className="relative flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[oklch(0.72_0.19_195)] text-white text-xs font-semibold">
              {pendingCount}
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1.5 flex-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <div key={item.href} className="w-full group">
              <Link
                href={item.href}
                className={cn(
                  "flex relative w-full items-center gap-3 px-3 py-2 rounded-full text-base font-bold transition-all duration-100",
                  isActive
                    ? "text-[oklch(0.72_0.19_195)]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {/* Glow background layer - only visible when active */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-full transition-all duration-200",
                    isActive
                      ? "bg-[oklch(0.72_0.19_195)]/10 border border-[oklch(0.72_0.19_195)]/20 shadow-lg shadow-[oklch(0.72_0.19_195)]/10"
                      : "bg-transparent border border-transparent group-hover:bg-muted"
                  )}
                />
                {/* Gradient overlay - only visible when active */}
                {isActive && (
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tl from-background/50 to-transparent" />
                )}
                {/* Content */}
                <Icon className="relative h-5 w-5" />
                <span className="relative">{item.label}</span>
              </Link>
            </div>
          );
        })}
      </nav>

      {/* User dropdown */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt=""
                className="h-6 w-6 rounded-full"
              />
            ) : (
              <div className="h-6 w-6 rounded-full bg-muted" />
            )}
            <span className="truncate flex-1 text-left">
              {user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? "Account"}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-56 p-1">
          <button
            type="button"
            onClick={() => signOut()}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </PopoverContent>
      </Popover>
    </aside>
  );
}
