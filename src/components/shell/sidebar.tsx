"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, Library, Film, Palette, FlaskConical, LogOut, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/create", label: "Create", icon: Plus },
  { href: "/library", label: "Library", icon: Library },
  { href: "/movie", label: "Movie", icon: Film },
  { href: "/templates", label: "Templates", icon: Palette },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <aside className="w-64 bg-white flex flex-col p-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3.5 py-3 mb-4">
        <FlaskConical className="h-6 w-6 text-primary" />
        <span className="text-base font-semibold tracking-tight">RemotionLab</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1.5 flex-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User dropdown */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
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
            className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </PopoverContent>
      </Popover>
    </aside>
  );
}
