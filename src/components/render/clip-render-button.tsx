"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Video, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ClipRenderButtonProps {
  clipId: string;
  disabled?: boolean;
}

export function ClipRenderButton({
  clipId,
  disabled = false,
}: ClipRenderButtonProps) {
  const startClipRender = useAction(api.triggerRender.startClipRender);
  const [isRendering, setIsRendering] = useState(false);

  const handleRender = async () => {
    setIsRendering(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await startClipRender({ clipId: clipId as any });
      toast.success("Clip render started! You'll be able to download the MP4 when it completes.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to start render";
      toast.error(message);
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRender}
      disabled={disabled || isRendering}
    >
      {isRendering ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Rendering...
        </>
      ) : (
        <>
          <Video className="h-4 w-4" />
          Render MP4
        </>
      )}
    </Button>
  );
}
