"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorDisplayProps {
  message: string;
  onRetry: () => void;
  retryCount: number;
  maxRetries?: number;
}

export function ErrorDisplay({
  message,
  onRetry,
  retryCount,
  maxRetries = 3,
}: ErrorDisplayProps) {
  const canRetry = retryCount < maxRetries;
  const attemptsRemaining = maxRetries - retryCount;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-950/20 dark:border-red-900/50">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
        <div className="space-y-3 flex-1">
          <div>
            <h3 className="font-medium text-red-800 dark:text-red-200">
              Generation failed
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {message}
            </p>
          </div>

          {canRetry ? (
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="border-red-200 hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900/30"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again ({attemptsRemaining} attempt{attemptsRemaining !== 1 ? "s" : ""} remaining)
            </Button>
          ) : (
            <p className="text-sm text-red-600 dark:text-red-400">
              Maximum retries reached. Try simplifying your prompt or describing
              a different animation.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
