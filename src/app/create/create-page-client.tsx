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
import type { TextAnimationProps } from "@/remotion/compositions/TextAnimation";
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
  animationProps: TextAnimationProps;
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

  // Store user in Convex on first visit (handles both new signups and existing users)
  useEffect(() => {
    storeUser().catch(console.error);
  }, [storeUser]);

  const handleGenerate = useCallback(
    async (prompt: string) => {
      setLastPrompt(prompt);
      setError(null);
      setIsGenerating(true);

      // Step through: analyzing -> generating
      setCurrentStep("analyzing");
      await new Promise((resolve) => setTimeout(resolve, 500));
      setCurrentStep("generating");

      try {
        const result = await generate({ prompt });

        // Validating step after successful generation
        setCurrentStep("validating");
        await new Promise((resolve) => setTimeout(resolve, 300));

        setLastGeneration(result as GenerationResult);
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
    [generate, error?.retryCount]
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

      {/* Success state */}
      {lastGeneration && !isGenerating && !error && (
        <div className="w-full max-w-2xl mb-6">
          <PreviewPlayer animationProps={lastGeneration.animationProps} />
          <div className="mt-4 flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="text-sm text-muted-foreground">
              <p>
                <span className="font-medium">Text:</span>{" "}
                {lastGeneration.animationProps.text}
              </p>
              <p>
                <span className="font-medium">Style:</span>{" "}
                {lastGeneration.animationProps.style}
              </p>
            </div>
            <button
              onClick={handleRetry}
              className="text-sm text-primary underline hover:no-underline"
            >
              Regenerate
            </button>
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
