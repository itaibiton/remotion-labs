"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Save, RotateCcw, Trash2, FastForward } from "lucide-react";

interface Generation {
  _id: string;
  prompt: string;
  code?: string;
  rawCode?: string;
  durationInFrames?: number;
  fps?: number;
  aspectRatio?: string;
  durationInSeconds?: number;
  status: "success" | "failed";
  errorMessage?: string;
  createdAt: number;
  batchId?: string;
  variationIndex?: number;
  variationCount?: number;
}

interface GenerationRowActionsProps {
  generation: Generation;
  onSave: (generation: Generation) => void;
  onDelete: (generation: Generation) => void;
  onRerun: (generation: Generation) => void;
  onExtendNext: (generation: Generation) => void;
}

export function GenerationRowActions({
  generation,
  onSave,
  onDelete,
  onRerun,
  onExtendNext,
}: GenerationRowActionsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isFailed = generation.status === "failed";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => onSave(generation)}
            disabled={isFailed || !generation.code}
          >
            <Save className="h-4 w-4" />
            Save to Library
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => onExtendNext(generation)}
            disabled={isFailed || !generation.code}
          >
            <FastForward className="h-4 w-4" />
            Extend Next
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onRerun(generation)}>
            <RotateCcw className="h-4 w-4" />
            Rerun
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete generation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this generation. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                onDelete(generation);
                setShowDeleteConfirm(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
