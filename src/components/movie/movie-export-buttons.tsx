"use client";

import { useState } from "react";
import { Package, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { generateMovieProjectZip } from "@/lib/export-movie-zip";
import { downloadBlob } from "@/lib/export-utils";

interface MovieExportButtonsProps {
  movieName: string;
  scenes: Array<{
    rawCode: string;
    name: string;
    durationInFrames: number;
    fps: number;
  }>;
  totalDurationInFrames: number;
  fps: number;
  disabled?: boolean;
}

export function MovieExportButtons({
  movieName,
  scenes,
  totalDurationInFrames,
  fps,
  disabled = false,
}: MovieExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const safeName =
    movieName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "movie";

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await generateMovieProjectZip({
        movieName,
        scenes,
        totalDurationInFrames,
        fps,
      });

      downloadBlob(blob, `${safeName}-remotion-project.zip`);
      toast.success("Movie project zip downloaded!");
      setShowInstructions(true);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to export movie project";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedCommand(label);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={disabled || isExporting}
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Package className="h-4 w-4" />
        )}
        Export Remotion Project
      </Button>

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Project Exported</DialogTitle>
            <DialogDescription>
              Your Remotion project has been downloaded. Follow these steps to
              run it locally.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <Step number={1} title="Unzip the project">
              <CodeBlock
                code={`unzip ${safeName}-remotion-project.zip`}
                label="unzip"
                copiedCommand={copiedCommand}
                onCopy={copyToClipboard}
              />
            </Step>

            <Step number={2} title="Install dependencies">
              <CodeBlock
                code={`cd remotionlab-movie-export && npm install`}
                label="install"
                copiedCommand={copiedCommand}
                onCopy={copyToClipboard}
              />
            </Step>

            <Step number={3} title="Preview in Remotion Studio">
              <CodeBlock
                code="npx remotion studio"
                label="studio"
                copiedCommand={copiedCommand}
                onCopy={copyToClipboard}
              />
            </Step>

            <Step number={4} title="Render to MP4">
              <CodeBlock
                code="npx remotion render Movie out/movie.mp4"
                label="render"
                copiedCommand={copiedCommand}
                onCopy={copyToClipboard}
              />
              <p className="text-muted-foreground mt-1">
                You can also render individual scenes: <code className="text-xs bg-muted px-1 py-0.5 rounded">npx remotion render Scene01</code>
              </p>
            </Step>
          </div>

          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-medium mb-1">
        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs mr-2">
          {number}
        </span>
        {title}
      </p>
      <div className="ml-7">{children}</div>
    </div>
  );
}

function CodeBlock({
  code,
  label,
  copiedCommand,
  onCopy,
}: {
  code: string;
  label: string;
  copiedCommand: string | null;
  onCopy: (text: string, label: string) => void;
}) {
  const isCopied = copiedCommand === label;
  return (
    <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2 font-mono text-xs">
      <code className="flex-1 break-all">{code}</code>
      <button
        onClick={() => onCopy(code, label)}
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        {isCopied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
