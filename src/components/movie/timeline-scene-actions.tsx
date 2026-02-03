"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, FastForward, Rewind, RotateCcw, Pencil } from "lucide-react";

interface TimelineSceneActionsProps {
  sceneIndex: number;
  onGenerateNext: (sceneIndex: number) => void;
  onGeneratePrevious: (sceneIndex: number) => void;
  onRegenerate: (sceneIndex: number) => void;
  onEdit: (sceneIndex: number) => void;
  disabled?: boolean;
}

export function TimelineSceneActions({
  sceneIndex,
  onGenerateNext,
  onGeneratePrevious,
  onRegenerate,
  onEdit,
  disabled,
}: TimelineSceneActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
          disabled={disabled}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Scene actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={() => onGenerateNext(sceneIndex)}>
          <FastForward className="h-4 w-4" />
          Generate Next
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onGeneratePrevious(sceneIndex)}>
          <Rewind className="h-4 w-4" />
          Generate Previous
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onRegenerate(sceneIndex)}>
          <RotateCcw className="h-4 w-4" />
          Re-generate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onEdit(sceneIndex)}>
          <Pencil className="h-4 w-4" />
          Edit
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
