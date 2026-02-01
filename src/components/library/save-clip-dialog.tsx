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

export interface SaveClipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rawCode: string;
  code: string;
  durationInFrames: number;
  fps: number;
  defaultName: string;
  onSaved?: (clipId: string) => void;
}

export function SaveClipDialog({
  open,
  onOpenChange,
  rawCode,
  code,
  durationInFrames,
  fps,
  defaultName,
  onSaved,
}: SaveClipDialogProps) {
  const [name, setName] = useState(defaultName);
  const [isSaving, setIsSaving] = useState(false);
  const saveClip = useMutation(api.clips.save);

  // Reset name when dialog opens
  useEffect(() => {
    if (open) {
      setName(defaultName);
    }
  }, [open, defaultName]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setIsSaving(true);
    try {
      const newClipId = await saveClip({
        name: trimmedName,
        code,
        rawCode,
        durationInFrames,
        fps,
      });
      toast.success("Clip saved!");
      onSaved?.(String(newClipId));
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save clip"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Clip</DialogTitle>
          <DialogDescription>
            Save this composition to your library for later use.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <label
            htmlFor="clip-name"
            className="text-sm font-medium leading-none"
          >
            Clip Name
          </label>
          <Input
            id="clip-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Animation"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) {
                handleSave();
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
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
