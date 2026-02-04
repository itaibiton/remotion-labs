"use client";

import { useCallback, useState } from "react";
import { useMutation, useAction } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { InputBar } from "@/components/generation/input-bar";
import { GenerationFeed } from "@/components/generation/generation-feed";
import { PreviewPlayer } from "@/components/preview/preview-player";
import { useGenerationSettings } from "@/hooks/use-generation-settings";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

function FeedContent() {
  const saveClip = useMutation(api.clips.save);
  const generate = useAction(api.generateAnimation.generate);
  const router = useRouter();
  const { settings, updateSetting, resetSettings } = useGenerationSettings();

  const [selectedGeneration, setSelectedGeneration] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = useCallback(
    async (prompt: string, _imageIds: string[]) => {
      if (isGenerating) return;

      setIsGenerating(true);
      toast.success("Creation started! Check the Create page for progress.");

      try {
        await generate({
          prompt,
          aspectRatio: settings.aspectRatio,
          durationInSeconds: settings.durationInSeconds,
          fps: settings.fps,
        });
        toast.success("Creation completed!");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Generation failed");
      } finally {
        setIsGenerating(false);
      }
    },
    [generate, settings.aspectRatio, settings.durationInSeconds, settings.fps, isGenerating]
  );

  const handleSelectGeneration = useCallback((generation: any) => {
    if (generation.status === "failed" || !generation.code) return;
    setSelectedGeneration(generation);
  }, []);

  const handleSaveGeneration = useCallback(
    async (generation: any) => {
      if (!generation.code || !generation.rawCode) {
        toast.error("Cannot save: generation has no code");
        return;
      }
      try {
        await saveClip({
          name: generation.prompt.slice(0, 50) || "Untitled",
          code: generation.code,
          rawCode: generation.rawCode,
          durationInFrames: generation.durationInFrames ?? 90,
          fps: generation.fps ?? 30,
        });
        toast.success("Saved to clip library!");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save clip");
      }
    },
    [saveClip]
  );

  const handleUsePrompt = useCallback(
    (generation: any) => {
      router.push(`/create?prompt=${encodeURIComponent(generation.prompt)}`);
    },
    [router]
  );

  // No-op handlers for actions hidden on public feed
  const noop = useCallback(() => {}, []);

  return (
    <div className="flex flex-col items-center">
      {/* Gradient fade pinned to top */}
      <div className="sticky top-0 z-[5] w-full h-32 bg-gradient-to-b from-background via-background/95 via-50% to-transparent pointer-events-none -mb-32" />

      {/* Input bar */}
      <div className="sticky top-6 z-10 w-full px-8 relative">
        <InputBar
          onSubmit={handleGenerate}
          isGenerating={isGenerating}
          hasExistingCode={false}
          disabled={false}
          settings={settings}
          onUpdateSetting={updateSetting}
          onResetSettings={resetSettings}
        />
      </div>

      {/* Public generation feed */}
      <div className="w-full px-6 pb-6 pt-12">
        <GenerationFeed
          queryType="public"
          hideActions
          onSelectGeneration={handleSelectGeneration}
          onSaveGeneration={handleSaveGeneration}
          onDeleteGeneration={noop}
          onRerunGeneration={noop}
          onExtendNextGeneration={noop}
          onExtendPreviousGeneration={noop}
          onUsePrompt={handleUsePrompt}
          onSaveAsTemplate={handleSaveGeneration}
        />
      </div>

      {/* Preview dialog */}
      <Dialog
        open={!!selectedGeneration}
        onOpenChange={(open) => { if (!open) setSelectedGeneration(null); }}
      >
        <DialogContent className="max-w-[95vw] w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 gap-3">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base sm:text-lg leading-snug break-words whitespace-normal">
              {selectedGeneration?.prompt}
            </DialogTitle>
            <DialogDescription>
              {selectedGeneration?.aspectRatio ?? "16:9"} &middot;{" "}
              {selectedGeneration?.fps ?? 30}fps &middot;{" "}
              {((selectedGeneration?.durationInFrames ?? 90) / (selectedGeneration?.fps ?? 30)).toFixed(1)}s
            </DialogDescription>
          </DialogHeader>
          {selectedGeneration?.code && (
            <PreviewPlayer
              code={selectedGeneration.code}
              durationInFrames={selectedGeneration.durationInFrames ?? 90}
              fps={selectedGeneration.fps ?? 30}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function FeedPageClient() {
  return (
    <div className="flex-1 flex flex-col">
      <AuthLoading>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </AuthLoading>

      <Unauthenticated>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Redirecting to sign in...</p>
        </div>
      </Unauthenticated>

      <Authenticated>
        <FeedContent />
      </Authenticated>
    </div>
  );
}
