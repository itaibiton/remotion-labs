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
import { Save } from "lucide-react";

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
}

function CreateContent({ selectedTemplate, clipId }: CreateContentProps) {
  const storeUser = useMutation(api.users.storeUser);
  const generate = useAction(api.generateAnimation.generate);
  const refine = useAction(api.generateAnimation.refine);

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
        const result = await generate({ prompt });

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
    [generate, error?.retryCount, validation]
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

  const handleUnifiedSubmit = useCallback(
    async (text: string) => {
      if (!lastGeneration) {
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
    [lastGeneration, handleGenerate, handleRefine, validation]
  );

  const handleRetry = useCallback(() => {
    if (lastPrompt) {
      handleGenerate(lastPrompt);
    }
  }, [lastPrompt, handleGenerate]);

  const promptPlaceholder = selectedTemplate
    ? "Describe how you'd like to customize this template..."
    : undefined; // Let PromptInput choose based on hasExistingCode

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      {/* Template context banner */}
      {selectedTemplate && !isGenerating && !lastGeneration && (
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

            {/* Render controls - temporarily disabled for code generation */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Happy with the preview? Render coming soon.
                </p>
                <button
                  disabled
                  className="px-4 py-2 text-sm bg-muted text-muted-foreground rounded-md cursor-not-allowed"
                >
                  Render (Coming Soon)
                </button>
              </div>
            </div>

            {/* Save clip */}
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Save this composition to your library
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveDialog(true)}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save as Clip
                </Button>
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

      <SaveClipDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        rawCode={editorCode}
        code={previewCode}
        durationInFrames={lastGeneration?.durationInFrames ?? 90}
        fps={lastGeneration?.fps ?? 30}
        defaultName={lastPrompt.slice(0, 50) || "Untitled Clip"}
      />
    </div>
  );
}

interface CreatePageClientProps {
  selectedTemplate: Template | null;
  clipId?: string;
}

export function CreatePageClient({ selectedTemplate, clipId }: CreatePageClientProps) {
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
        <CreateContent selectedTemplate={selectedTemplate} clipId={clipId} />
      </Authenticated>
    </div>
  );
}
