"use client";

import { useState, useCallback } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

export interface CodeDisplayError {
  line: number;
  column: number;
  message: string;
}

export interface CodeDisplayProps {
  code: string;
  errors?: CodeDisplayError[];
}

/**
 * CodeDisplay component for showing AI-generated code in a Monaco editor.
 *
 * Features:
 * - Read-only Monaco editor with dark theme
 * - Line numbers always visible
 * - Prominent copy-to-clipboard button
 * - Inline error display via Monaco markers (red squiggles)
 */
export function CodeDisplay({ code, errors = [] }: CodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Code copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  }, [code]);

  // Set up Monaco markers for inline errors (red squiggles)
  const handleEditorMount = useCallback(
    (editorInstance: editor.IStandaloneCodeEditor, monaco: Monaco) => {
      if (errors.length > 0) {
        const model = editorInstance.getModel();
        if (model) {
          const markers: editor.IMarkerData[] = errors.map((err) => ({
            severity: monaco.MarkerSeverity.Error,
            startLineNumber: err.line,
            startColumn: err.column,
            endLineNumber: err.line,
            endColumn: err.column + 10,
            message: err.message,
          }));
          monaco.editor.setModelMarkers(model, "validation", markers);
        }
      }
    },
    [errors]
  );

  return (
    <div className="relative rounded-lg border overflow-hidden h-full">
      {/* Header with copy button */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted border-b">
        <span className="text-sm font-medium">Generated Code</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8"
        >
          {copied ? (
            <Check className="h-4 w-4 mr-2" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      {/* Monaco Editor */}
      <Editor
        height="300px"
        language="typescript"
        theme="vs-dark"
        value={code}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          fontSize: 13,
          wordWrap: "on",
          folding: true,
          automaticLayout: true,
          contextmenu: false,
          renderLineHighlight: "none",
          selectionHighlight: false,
          occurrencesHighlight: "off",
          cursorStyle: "line",
          cursorBlinking: "solid",
        }}
        onMount={handleEditorMount}
      />
    </div>
  );
}
