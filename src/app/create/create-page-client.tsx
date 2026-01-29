"use client";

import { useState, useCallback, useEffect } from "react";
import { useAction, useMutation } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { UserMenu } from "@/components/auth/user-menu";
import { PromptInput } from "@/components/generation/prompt-input";
import { GenerationStatus } from "@/components/generation/generation-status";
import { ErrorDisplay } from "@/components/generation/error-display";
import { PreviewPlayer } from "@/components/preview/preview-player";
import { CodeDisplay } from "@/components/code-editor/code-display";
import { useDebouncedValidation } from "@/hooks/use-debounced-validation";
import type { Template } from "@/lib/templates";
import Link from "next/link";
import { toast } from "sonner";

type GenerationStep = "analyzing" | "generating" | "validating" | null;

interface GenerationError {
  message: string;
  retryCount: number;
}

interface GenerationResult {
  id: string;
  code: string;
  durationInFrames: number;
  fps: number;
}

interface CreateContentProps {
  selectedTemplate: Template | null;
}

function CreateContent({ selectedTemplate }: CreateContentProps) {
  const storeUser = useMutation(api.users.storeUser);
  const generate = useAction(api.generateAnimation.generate);

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<GenerationStep>(null);
  const [error, setError] = useState<GenerationError | null>(null);
  const [lastGeneration, setLastGeneration] = useState<GenerationResult | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string>("");

  // Editor editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState<string | null>(null);
  const [skipValidation, setSkipValidation] = useState(true);

  // Current code: edited version if editing, otherwise generation code
  const currentCode = editedCode ?? lastGeneration?.code ?? "";

  // Debounced validation on user edits
  const { isValid, errors, resetToValid } = useDebouncedValidation(
    currentCode,
    500,
    skipValidation
  );

  const handleEditToggle = useCallback(() => {
    setIsEditing((prev) => {
      if (!prev) {
        // Entering edit mode: initialize edited code from current
        setEditedCode(lastGeneration?.code ?? "");
        setSkipValidation(false);
      }
      return !prev;
    });
  }, [lastGeneration?.code]);

  const handleCodeChange = useCallback((code: string) => {
    setEditedCode(code);
    setSkipValidation(false);
  }, []);

  // Store user in Convex on first visit (handles both new signups and existing users)
  useEffect(() => {
    storeUser().catch(console.error);
  }, [storeUser]);

  const handleGenerate = useCallback(
    async (prompt: string) => {
      setLastPrompt(prompt);
      setError(null);
      setIsGenerating(true);
      // Reset editing state on new generation
      setIsEditing(false);
      setEditedCode(null);
      setSkipValidation(true);
      resetToValid();

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
    [generate, error?.retryCount, resetToValid]
  );

  const handleRetry = useCallback(() => {
    if (lastPrompt) {
      handleGenerate(lastPrompt);
    }
  }, [lastPrompt, handleGenerate]);

  const promptPlaceholder = selectedTemplate
    ? "Describe how you'd like to customize this template..."
    : "Describe the animation you want to create...";

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
            {/* Preview */}
            <div>
              <PreviewPlayer
                code={lastGeneration.code}
                durationInFrames={lastGeneration.durationInFrames}
                fps={lastGeneration.fps}
              />
            </div>

            {/* Code */}
            <div>
              <CodeDisplay
                code={currentCode}
                originalCode={lastGeneration.code}
                isEditing={isEditing}
                onEditToggle={handleEditToggle}
                onChange={handleCodeChange}
                errors={errors}
                isValid={isValid}
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
          </div>
        </div>
      )}

      {/* Prompt input - always visible unless generating */}
      {!isGenerating && (
        <PromptInput
          onSubmit={handleGenerate}
          isGenerating={isGenerating}
          disabled={false}
          placeholder={promptPlaceholder}
        />
      )}
    </div>
  );
}

interface CreatePageClientProps {
  selectedTemplate: Template | null;
}

export function CreatePageClient({ selectedTemplate }: CreatePageClientProps) {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <Link href="/" className="text-xl font-bold">
          RemotionLab
        </Link>
        <UserMenu />
      </header>

      {/* Content */}
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
          <CreateContent selectedTemplate={selectedTemplate} />
        </Authenticated>
      </div>
    </main>
  );
}
