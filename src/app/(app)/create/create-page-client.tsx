"use client";

import { useState, useCallback, useEffect } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { PromptInput } from "@/components/generation/prompt-input";
import { GenerationStatus } from "@/components/generation/generation-status";
import { ErrorDisplay } from "@/components/generation/error-display";
import { PreviewPlayer } from "@/components/preview/preview-player";
import { CodeDisplay } from "@/components/code-editor/code-display";
import { ChatMessages, type ChatMessage } from "@/components/generation/chat-messages";
import { useDebouncedValidation } from "@/hooks/use-debounced-validation";
import type { Template } from "@/lib/templates";
import Link from "next/link";
import { toast } from "sonner";
import { ExportButtons } from "@/components/export/export-buttons";
import { SaveClipDialog } from "@/components/library/save-clip-dialog";
import { Button } from "@/components/ui/button";
import { Save, FastForward, Film, Settings2 } from "lucide-react";
import { ClipRenderButton } from "@/components/render/clip-render-button";
import { AddToMovieDialog } from "@/components/library/add-to-movie-dialog";
import { GenerationFeed } from "@/components/generation/generation-feed";
import { GenerationSettingsPanel } from "@/components/generation/generation-settings";
import { useGenerationSettings } from "@/hooks/use-generation-settings";
import { useRouter } from "next/navigation";

type GenerationStep = "analyzing" | "generating" | "validating" | null;

interface GenerationError {
  message: string;
  retryCount: number;
}

interface GenerationResult {
  id: string;
  rawCode: string;
  code: string;
  durationInFrames: number;
  fps: number;
}

interface CreateContentProps {
  selectedTemplate: Template | null;
  clipId?: string;
  sourceClipId?: string;
}

function CreateContent({ selectedTemplate, clipId, sourceClipId }: CreateContentProps) {
  const storeUser = useMutation(api.users.storeUser);
  const generate = useAction(api.generateAnimation.generate);
  const refine = useAction(api.generateAnimation.refine);
  const continuationAction = useAction(api.generateAnimation.generateContinuation);
  const router = useRouter();
  const { settings, updateSetting, resetSettings } = useGenerationSettings();
  const [showSettings, setShowSettings] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<GenerationStep>(null);
  const [error, setError] = useState<GenerationError | null>(null);
  const [lastGeneration, setLastGeneration] = useState<GenerationResult | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string>("");

  // Editor editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState<string | null>(null);
  const [skipValidation, setSkipValidation] = useState(true);

  // Save clip dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Continuation and contextual action state
  const [showAddToMovieDialog, setShowAddToMovieDialog] = useState(false);
  const [savedClipId, setSavedClipId] = useState<string | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isRefining, setIsRefining] = useState(false);

  // Current editor code: edited version if editing, otherwise raw JSX from generation
  const editorCode = editedCode ?? lastGeneration?.rawCode ?? "";

  // Debounced validation on user edits
  const validation = useDebouncedValidation(
    editorCode,
    500,
    skipValidation
  );

  // Preview code: use validated+transformed code from user edits, otherwise server-transformed code
  // This ensures preview freezes on last valid code when validation fails
  const previewCode = validation.transformedCode ?? lastGeneration?.code ?? "";

  const handleEditToggle = useCallback(() => {
    setIsEditing((prev) => {
      if (!prev) {
        // Entering edit mode: initialize edited code from raw JSX
        setEditedCode(lastGeneration?.rawCode ?? "");
        setSkipValidation(false);
      }
      return !prev;
    });
  }, [lastGeneration?.rawCode]);

  const handleCodeChange = useCallback((code: string) => {
    setEditedCode(code);
    setSkipValidation(false);
  }, []);

  // Store user in Convex on first visit (handles both new signups and existing users)
  useEffect(() => {
    storeUser().catch(console.error);
  }, [storeUser]);

  // Load clip from URL param (when opening from library)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clipData = useQuery(
    api.clips.get,
    clipId ? { id: clipId as any } : "skip"
  );

  // Populate editor state when clip data loads
  useEffect(() => {
    if (clipData && clipId) {
      setLastGeneration({
        id: clipData._id,
        rawCode: clipData.rawCode,
        code: clipData.code,
        durationInFrames: clipData.durationInFrames,
        fps: clipData.fps,
      });
      setLastPrompt(clipData.name);
      // Reset editing state for clean load
      setEditedCode(null);
      setIsEditing(false);
      setSkipValidation(true);
      setChatMessages([]);
    }
  }, [clipData, clipId]);

  // Source clip query for continuation mode context display
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sourceClipData = useQuery(
    api.clips.get,
    sourceClipId ? { id: sourceClipId as any } : "skip"
  );

  // Effective clip ID: from URL param (editing existing) or from just-saved clip
  const effectiveClipId = clipId ?? savedClipId;

  const handleGenerate = useCallback(
    async (prompt: string) => {
      setLastPrompt(prompt);
      setError(null);
      setIsGenerating(true);
      // Reset editing state on new generation
      setIsEditing(false);
      setEditedCode(null);
      setSkipValidation(true);
      validation.resetToValid();
      // Reset chat on new generation
      setChatMessages([]);

      // Step through: analyzing -> generating
      setCurrentStep("analyzing");
      await new Promise((resolve) => setTimeout(resolve, 500));
      setCurrentStep("generating");

      try {
        const result = await generate({
          prompt,
          aspectRatio: settings.aspectRatio,
          durationInSeconds: settings.durationInSeconds,
          fps: settings.fps,
        });

        // Validating step after successful generation
        setCurrentStep("validating");
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Validate result has required fields
        if (!result || typeof result !== "object") {
          throw new Error("Invalid response from generation service");
        }

        const generationResult: GenerationResult = {
          id: String(result.id),
          rawCode: result.rawCode,
          code: result.code,
          // Provide defaults for safety (should always be present from action)
          durationInFrames: result.durationInFrames ?? 90,
          fps: result.fps ?? 30,
        };

        // Validate we have actual code
        if (!generationResult.code) {
          throw new Error("Generation did not return code");
        }

        setLastGeneration(generationResult);
        toast.success("Animation generated successfully!");
      } catch (e) {
        const errorMessage =
          e instanceof Error ? e.message : "Generation failed";
        setError({
          message: errorMessage,
          retryCount: (error?.retryCount ?? 0) + 1,
        });
        toast.error("Generation failed");
      } finally {
        setIsGenerating(false);
        setCurrentStep(null);
      }
    },
    [generate, error?.retryCount, validation, settings.aspectRatio, settings.durationInSeconds, settings.fps]
  );

  const handleRefine = useCallback(
    async (prompt: string) => {
      setIsRefining(true);
      try {
        // Add user message to chat
        const userMessage: ChatMessage = { role: "user", content: prompt };
        setChatMessages((prev) => [...prev, userMessage]);

        const result = await refine({
          currentCode: editorCode,
          refinementPrompt: prompt,
          conversationHistory: chatMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        });

        // Update editor with refined code (raw JSX)
        setEditedCode(result.rawCode);
        setSkipValidation(true);
        setTimeout(() => setSkipValidation(false), 100);

        // Update generation result for preview
        setLastGeneration((prev) =>
          prev
            ? {
                ...prev,
                rawCode: result.rawCode,
                code: result.code,
                durationInFrames: result.durationInFrames,
                fps: result.fps,
              }
            : prev
        );

        // Add assistant message to chat
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: `Updated the animation based on: "${prompt}"`,
        };
        setChatMessages((prev) => [...prev, assistantMessage]);

        toast.success("Animation refined!");
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Refinement failed";
        toast.error(errorMessage);
        // Remove the user message on failure
        setChatMessages((prev) => prev.slice(0, -1));
      } finally {
        setIsRefining(false);
      }
    },
    [editorCode, chatMessages, refine]
  );

  const handleContinuationGenerate = useCallback(
    async (prompt: string) => {
      if (!sourceClipId) return;
      setError(null);
      setIsGenerating(true);
      setIsEditing(false);
      setEditedCode(null);
      setSkipValidation(true);
      validation.resetToValid();
      setChatMessages([]);
      setSavedClipId(null);

      setCurrentStep("analyzing");
      await new Promise((r) => setTimeout(r, 500));
      setCurrentStep("generating");

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await continuationAction({
          sourceClipId: sourceClipId as any,
          prompt: prompt || undefined,
        });

        setCurrentStep("validating");
        await new Promise((r) => setTimeout(r, 300));

        setLastGeneration({
          id: "continuation",
          rawCode: result.rawCode,
          code: result.code,
          durationInFrames: result.durationInFrames,
          fps: result.fps,
        });
        setLastPrompt(prompt || "Continuation from previous scene");
        toast.success("Continuation generated!");
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Continuation failed";
        setError({ message: errorMessage, retryCount: (error?.retryCount ?? 0) + 1 });
        toast.error("Continuation generation failed");
      } finally {
        setIsGenerating(false);
        setCurrentStep(null);
      }
    },
    [sourceClipId, continuationAction, error?.retryCount, validation]
  );

  const handleUnifiedSubmit = useCallback(
    async (text: string) => {
      if (sourceClipId && !lastGeneration) {
        // Continuation mode: first submission generates continuation
        await handleContinuationGenerate(text);
      } else if (!lastGeneration) {
        await handleGenerate(text);
      } else if (text.toLowerCase().startsWith("start over:")) {
        const newPrompt = text.replace(/^start over:\s*/i, "").trim();
        setChatMessages([]);
        setEditedCode(null);
        setLastGeneration(null);
        setIsEditing(false);
        setSkipValidation(true);
        validation.resetToValid();
        if (newPrompt) {
          await handleGenerate(newPrompt);
        }
      } else {
        await handleRefine(text);
      }
    },
    [sourceClipId, lastGeneration, handleGenerate, handleContinuationGenerate, handleRefine, validation]
  );

  const handleRetry = useCallback(() => {
    if (lastPrompt) {
      handleGenerate(lastPrompt);
    }
  }, [lastPrompt, handleGenerate]);

  const handleSelectGeneration = useCallback((generation: any) => {
    if (generation.status === "failed" || !generation.code) return;
    setLastGeneration({
      id: String(generation._id),
      rawCode: generation.rawCode ?? "",
      code: generation.code,
      durationInFrames: generation.durationInFrames ?? 90,
      fps: generation.fps ?? 30,
    });
    setLastPrompt(generation.prompt);
    setEditedCode(null);
    setIsEditing(false);
    setSkipValidation(true);
    setChatMessages([]);
    setSavedClipId(null);
  }, []);

  const promptPlaceholder = sourceClipId
    ? "Describe what should happen next (or press Enter for automatic continuation)..."
    : selectedTemplate
      ? "Describe how you'd like to customize this template..."
      : undefined; // Let PromptInput choose based on hasExistingCode

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      {/* Continuation context banner */}
      {sourceClipId && sourceClipData && !isGenerating && !lastGeneration && (
        <div className="w-full max-w-2xl mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm font-medium">
            Generating continuation from: {sourceClipData.name}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            The next scene will start where this clip&apos;s animation ends.
          </p>
        </div>
      )}

      {/* Template context banner */}
      {selectedTemplate && !sourceClipId && !isGenerating && !lastGeneration && (
        <div className="w-full max-w-2xl mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                Using template: {selectedTemplate.name}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedTemplate.description}
              </p>
            </div>
            <Link
              href="/templates"
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Change template
            </Link>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !isGenerating && (
        <div className="w-full max-w-2xl mb-6">
          <ErrorDisplay
            message={error.message}
            onRetry={handleRetry}
            retryCount={error.retryCount}
          />
        </div>
      )}

      {/* Generating state */}
      {isGenerating && currentStep && (
        <div className="mb-8">
          <GenerationStatus currentStep={currentStep} />
        </div>
      )}

      {/* Success state - side-by-side preview and code */}
      {lastGeneration && !isGenerating && !error && (
        <div className="w-full max-w-5xl mb-6">
          {/* Two-column layout: Preview | Code */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Preview - uses validated transformed code or server-transformed code */}
            <div>
              <PreviewPlayer
                code={previewCode}
                durationInFrames={lastGeneration.durationInFrames}
                fps={lastGeneration.fps}
              />
            </div>

            {/* Code - shows raw JSX for editing */}
            <div>
              <CodeDisplay
                code={editorCode}
                originalCode={lastGeneration.rawCode}
                isEditing={isEditing}
                onEditToggle={handleEditToggle}
                onChange={handleCodeChange}
                errors={validation.errors}
                isValid={validation.isValid}
              />
            </div>
          </div>

          {/* Render section */}
          <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
            {/* Animation info */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                <p>
                  <span className="font-medium">Duration:</span>{" "}
                  {(lastGeneration.durationInFrames / lastGeneration.fps).toFixed(1)}s
                </p>
                <p>
                  <span className="font-medium">Frames:</span>{" "}
                  {lastGeneration.durationInFrames} @ {lastGeneration.fps}fps
                </p>
              </div>
              <button
                onClick={handleRetry}
                className="text-sm text-primary underline hover:no-underline"
              >
                Regenerate
              </button>
            </div>

            {/* Render controls */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {effectiveClipId
                    ? "Render this clip to MP4 via cloud rendering"
                    : "Save as a clip first to enable MP4 rendering"}
                </p>
                <ClipRenderButton
                  clipId={effectiveClipId ?? ""}
                  disabled={!effectiveClipId || !lastGeneration}
                />
              </div>
            </div>

            {/* Contextual actions */}
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Save as Clip -- always available */}
                <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(true)}>
                  <Save className="h-4 w-4 mr-2" />
                  Save as Clip
                </Button>

                {/* Add to Movie -- available when clip is saved */}
                {effectiveClipId && (
                  <Button variant="outline" size="sm" onClick={() => setShowAddToMovieDialog(true)}>
                    <Film className="h-4 w-4 mr-2" />
                    Add to Movie
                  </Button>
                )}

                {/* Generate Next Scene -- available when clip is saved */}
                {effectiveClipId && (
                  <Button variant="outline" size="sm" onClick={() => router.push(`/create?sourceClipId=${effectiveClipId}`)}>
                    <FastForward className="h-4 w-4 mr-2" />
                    Generate Next Scene
                  </Button>
                )}
              </div>
            </div>

            {/* Export controls */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Export source code for standalone use
                </p>
                <ExportButtons
                  rawCode={lastGeneration.rawCode}
                  prompt={lastPrompt}
                  durationInFrames={lastGeneration.durationInFrames}
                  fps={lastGeneration.fps}
                />
              </div>
            </div>
          </div>

          {/* Chat messages - shown when conversation exists */}
          {chatMessages.length > 0 && (
            <div className="mt-4 border rounded-lg">
              <ChatMessages messages={chatMessages} isRefining={isRefining} />
            </div>
          )}
        </div>
      )}

      {/* Settings toggle + panel */}
      {!isGenerating && (
        <div className="w-full max-w-2xl mb-4">
          <div className="flex items-center justify-end mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
          {showSettings && (
            <div className="p-4 border rounded-lg mb-4">
              <GenerationSettingsPanel
                settings={settings}
                onUpdateSetting={updateSetting}
                onReset={resetSettings}
              />
            </div>
          )}
        </div>
      )}

      {/* Prompt input - visible when not generating */}
      {!isGenerating && (
        <PromptInput
          onSubmit={handleUnifiedSubmit}
          isGenerating={isGenerating}
          isRefining={isRefining}
          hasExistingCode={!!lastGeneration}
          disabled={false}
          placeholder={promptPlaceholder}
        />
      )}

      {/* Generation Feed - shown when no generation is selected */}
      {!isGenerating && !lastGeneration && (
        <div className="w-full max-w-2xl mt-8">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Past Generations</h3>
          <GenerationFeed onSelectGeneration={handleSelectGeneration} />
        </div>
      )}

      <SaveClipDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        rawCode={editorCode}
        code={previewCode}
        durationInFrames={lastGeneration?.durationInFrames ?? 90}
        fps={lastGeneration?.fps ?? 30}
        defaultName={lastPrompt.slice(0, 50) || "Untitled Clip"}
        onSaved={(newClipId) => setSavedClipId(newClipId)}
      />

      {effectiveClipId && (
        <AddToMovieDialog
          open={showAddToMovieDialog}
          onOpenChange={setShowAddToMovieDialog}
          clipId={effectiveClipId}
        />
      )}
    </div>
  );
}

interface CreatePageClientProps {
  selectedTemplate: Template | null;
  clipId?: string;
  sourceClipId?: string;
}

export function CreatePageClient({ selectedTemplate, clipId, sourceClipId }: CreatePageClientProps) {
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
        <CreateContent selectedTemplate={selectedTemplate} clipId={clipId} sourceClipId={sourceClipId} />
      </Authenticated>
    </div>
  );
}
