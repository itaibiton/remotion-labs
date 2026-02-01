"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { ClipCard } from "./clip-card";
import { toast } from "sonner";
import { Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function ClipLibrary() {
  const clips = useQuery(api.clips.list);
  const removeClip = useMutation(api.clips.remove);
  const router = useRouter();

  const handleOpen = (clipId: string) => {
    router.push(`/create?clipId=${clipId}`);
  };

  const handleDelete = async (clipId: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await removeClip({ id: clipId as any });
      toast.success("Clip deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete clip"
      );
    }
  };

  // Loading state
  if (clips === undefined) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg overflow-hidden border">
            <div className="aspect-video bg-muted animate-pulse" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
              <div className="h-3 bg-muted animate-pulse rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (clips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Library className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-1">No clips yet</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Save an animation from the Create page to see it here.
        </p>
        <Button asChild>
          <Link href="/create">Go to Create</Link>
        </Button>
      </div>
    );
  }

  // Normal state
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {clips.map((clip) => (
        <ClipCard
          key={clip._id}
          clip={clip}
          onOpen={handleOpen}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
