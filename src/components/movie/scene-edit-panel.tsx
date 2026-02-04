"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { CodeDisplay } from "@/components/code-editor/code-display";
import { useDebouncedValidation } from "@/hooks/use-debounced-validation";
import { Player } from "@remotion/player";
import { DynamicCode } from "@/remotion/compositions/DynamicCode";

interface SceneEditPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clip: {
    _id: string;
    name: string;
    code: string;
    rawCode: string;
    durationInFrames: number;
    fps: number;
  } | null;
  onSave: (clipId: string, code: string, rawCode: string) => Promise<void>;
  isSaving?: boolean;
}

export function SceneEditPanel({
  open,
  onOpenChange,
  clip,
  onSave,
  isSaving,
}: SceneEditPanelProps) {
  const [editedCode, setEditedCode] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  // Reset when clip changes
  useEffect(() => {
    if (clip) {
      setEditedCode(clip.rawCode);
      setIsEditing(false);
    }
  }, [clip?._id, clip?.rawCode]);

  // Validation hook for live preview
  const validation = useDebouncedValidation(editedCode, 500, !isEditing || !clip);

  // Use validated code for preview, fall back to original
  const previewCode = validation.isValid && validation.transformedCode
    ? validation.transformedCode
    : clip?.code ?? "";

  const handleSave = async () => {
    if (!clip || !validation.isValid || !validation.transformedCode) return;
    await onSave(clip._id, validation.transformedCode, editedCode);
    onOpenChange(false);
  };

  const hasChanges = clip && editedCode !== clip.rawCode;

  // Handle sheet close - show confirmation if unsaved changes
  const handleOpenChange = (open: boolean) => {
    if (!open && hasChanges) {
      setShowDiscardDialog(true);
      return;
    }
    onOpenChange(open);
  };

  // Handle discard confirmation
  const handleDiscard = () => {
    setShowDiscardDialog(false);
    onOpenChange(false);
  };

  if (!clip) return null;

  return (
    <>
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-[550px] sm:max-w-[550px] flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="truncate">Edit: {clip.name}</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-4 mt-4 flex-1 min-h-0">
          {/* Preview player */}
          <div className="h-[180px] flex-shrink-0 bg-black rounded-lg overflow-hidden">
            <Player
              component={DynamicCode}
              inputProps={{
                code: previewCode,
                durationInFrames: clip.durationInFrames,
                fps: clip.fps,
              }}
              compositionWidth={1920}
              compositionHeight={1080}
              durationInFrames={clip.durationInFrames}
              fps={clip.fps}
              style={{ width: "100%", height: "100%" }}
              controls
              loop
            />
          </div>

          {/* Code editor */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <CodeDisplay
              code={editedCode}
              originalCode={clip.rawCode}
              isEditing={isEditing}
              onEditToggle={() => setIsEditing(!isEditing)}
              onChange={setEditedCode}
              errors={validation.errors}
              isValid={validation.isValid}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 flex-shrink-0 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!validation.isValid || !hasChanges || isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>

    <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard changes?</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Are you sure you want to close?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDiscard}>
            Discard
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
