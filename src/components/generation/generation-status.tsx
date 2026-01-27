"use client";

import { Loader2, CheckCircle2, Circle } from "lucide-react";

const STEPS = [
  { id: "analyzing", label: "Analyzing prompt..." },
  { id: "generating", label: "Generating animation..." },
  { id: "validating", label: "Validating code..." },
] as const;

type StepId = (typeof STEPS)[number]["id"];

interface GenerationStatusProps {
  currentStep: StepId | "complete";
}

export function GenerationStatus({ currentStep }: GenerationStatusProps) {
  const getStepStatus = (stepId: StepId) => {
    if (currentStep === "complete") return "complete";

    const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
    const stepIndex = STEPS.findIndex((s) => s.id === stepId);

    if (stepIndex < currentIndex) return "complete";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {STEPS.map((step) => {
          const status = getStepStatus(step.id);

          return (
            <div key={step.id} className="flex items-center gap-3">
              {status === "complete" && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
              {status === "active" && (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              )}
              {status === "pending" && (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
              <span
                className={
                  status === "active"
                    ? "font-medium"
                    : status === "pending"
                      ? "text-muted-foreground"
                      : ""
                }
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground">
        Usually takes ~10-30 seconds
      </p>
    </div>
  );
}
