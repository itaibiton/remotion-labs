"use client";

import { useState, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Video, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { TextAnimationProps } from "@/remotion/compositions/TextAnimation";

interface RenderButtonProps {
  generationId: Id<"generations">;
  animationProps: TextAnimationProps;
  onRenderStarted: (renderJobId: Id<"renders">) => void;
  disabled?: boolean;
}

export function RenderButton({
  generationId,
  animationProps,
  onRenderStarted,
  disabled = false,
}: RenderButtonProps) {
  const startRender = useAction(api.triggerRender.startRender);
  const [isStarting, setIsStarting] = useState(false);

  const handleRender = useCallback(async () => {
    setIsStarting(true);
    try {
      const result = await startRender({
        generationId,
        animationProps,
      });
      toast.success("Render started!");
      onRenderStarted(result.renderJobId as Id<"renders">);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start render";
      toast.error(message);
    } finally {
      setIsStarting(false);
    }
  }, [startRender, generationId, animationProps, onRenderStarted]);

  return (
    <Button
      onClick={handleRender}
      disabled={disabled || isStarting}
      className="gap-2"
    >
      {isStarting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Starting...
        </>
      ) : (
        <>
          <Video className="h-4 w-4" />
          Render Video
        </>
      )}
    </Button>
  );
}
