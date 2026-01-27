"use client";

import Link from "next/link";
import { UserMenu } from "@/components/auth/user-menu";
import { TemplateGallery } from "@/components/templates/template-gallery";

export default function TemplatesPage() {
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
      <div className="flex-1 flex flex-col p-6">
        <div className="max-w-6xl mx-auto w-full space-y-6">
          {/* Page header */}
          <div>
            <h1 className="text-3xl font-bold">Templates</h1>
            <p className="text-muted-foreground mt-1">
              Choose a starting point for your animation
            </p>
          </div>

          {/* Template gallery */}
          <TemplateGallery />

          {/* Start from scratch option */}
          <div className="pt-6 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              Or start with a blank canvas:
            </p>
            <Link
              href="/create"
              className="inline-flex items-center text-sm font-medium text-primary hover:underline"
            >
              Start from scratch
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
