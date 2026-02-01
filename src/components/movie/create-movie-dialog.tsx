"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export interface CreateMovieDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (movieId: string) => void;
}

export function CreateMovieDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateMovieDialogProps) {
  const [name, setName] = useState("My Movie");
  const [isSaving, setIsSaving] = useState(false);
  const createMovie = useMutation(api.movies.create);

  // Reset name when dialog opens
  useEffect(() => {
    if (open) {
      setName("My Movie");
    }
  }, [open]);

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setIsSaving(true);
    try {
      const movieId = await createMovie({ name: trimmedName });
      toast.success("Movie created!");
      onOpenChange(false);
      onCreated(movieId);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create movie"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Movie</DialogTitle>
          <DialogDescription>
            Give your movie a name to get started.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <label
            htmlFor="movie-name"
            className="text-sm font-medium leading-none"
          >
            Movie Name
          </label>
          <Input
            id="movie-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Movie"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) {
                handleCreate();
              }
            }}
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isSaving || !name.trim()}
          >
            {isSaving ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
