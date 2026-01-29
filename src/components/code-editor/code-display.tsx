"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Pencil,
  Lock,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import type { ValidationError } from "@/hooks/use-debounced-validation";

export interface CodeDisplayProps {
  /** Current code to display (raw JSX) */
  code: string;
  /** AI-generated code for "Reset to original" */
  originalCode?: string;
  /** Whether editor is in edit mode */
  isEditing: boolean;
  /** Toggle edit mode callback */
  onEditToggle: () => void;
  /** Code change callback (when editing) */
  onChange?: (code: string) => void;
  /** Validation errors from parent */
  errors?: ValidationError[];
  /** Validation status from parent */
  isValid?: boolean;
}

/**
 * CodeDisplay component for showing and editing code in a Monaco editor.
 *
 * Features:
 * - Toggle between read-only and editable mode
 * - Dark-themed Monaco editor with line numbers
 * - Status badge: green check (valid) or red X (errors)
 * - Inline error markers (red squiggles) via Monaco setModelMarkers
 * - Reset to original AI-generated code button
 * - Copy-to-clipboard button
 */
export function CodeDisplay({
  code,
  originalCode,
  isEditing,
  onEditToggle,
  onChange,
  errors = [],
  isValid,
}: CodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const monacoRef = useRef<Monaco | null>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

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

  /**
   * Store Monaco and editor instance refs on mount.
   */
  const handleEditorMount = useCallback(
    (editorInstance: editor.IStandaloneCodeEditor, monaco: Monaco) => {
      editorRef.current = editorInstance;
      monacoRef.current = monaco;
    },
    []
  );

  /**
   * Update Monaco markers whenever errors change.
   * Clears markers when no errors, sets red squiggles when errors exist.
   */
  useEffect(() => {
    const monaco = monacoRef.current;
    const model = editorRef.current?.getModel();
    if (!monaco || !model) return;

    if (errors.length === 0) {
      monaco.editor.setModelMarkers(model, "validation", []);
      return;
    }

    const markers: editor.IMarkerData[] = errors.map((err) => ({
      severity: monaco.MarkerSeverity.Error,
      startLineNumber: err.line,
      startColumn: err.column + 1, // Monaco is 1-based
      endLineNumber: err.line,
      endColumn: err.column + 20, // Reasonable highlight width
      message: err.suggestion ?? err.message,
    }));

    monaco.editor.setModelMarkers(model, "validation", markers);
  }, [errors]);

  /**
   * Handle reset to original AI-generated code.
   */
  const handleReset = useCallback(() => {
    if (originalCode && onChange) {
      onChange(originalCode);
      toast.success("Reset to original code");
    }
  }, [originalCode, onChange]);

  const showResetButton =
    isEditing && originalCode && code !== originalCode;

  return (
    <div className="relative rounded-lg border overflow-hidden h-full">
      {/* Header with status badge, edit toggle, reset, and copy buttons */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted border-b">
        <div className="flex items-center gap-2">
          {/* Status badge */}
          {isValid === false ? (
            <XCircle className="h-4 w-4 text-destructive" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
          <span className="text-sm font-medium">Generated Code</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Reset to Original button */}
          {showResetButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset
            </Button>
          )}

          {/* Edit/Lock toggle button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onEditToggle}
            className="h-8"
          >
            {isEditing ? (
              <Lock className="h-4 w-4 mr-2" />
            ) : (
              <Pencil className="h-4 w-4 mr-2" />
            )}
            {isEditing ? "Lock" : "Edit"}
          </Button>

          {/* Copy button */}
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
      </div>

      {/* Monaco Editor */}
      <Editor
        height="400px"
        language="typescript"
        theme="vs-dark"
        value={code}
        onChange={(value) => onChange?.(value ?? "")}
        onMount={handleEditorMount}
        options={{
          readOnly: !isEditing,
          minimap: { enabled: false },
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          fontSize: 13,
          wordWrap: "on",
          folding: true,
          automaticLayout: true,
          contextmenu: false,
          renderLineHighlight: isEditing ? "line" : "none",
          selectionHighlight: false,
          occurrencesHighlight: "off",
          cursorStyle: "line",
          cursorBlinking: isEditing ? "blink" : "solid",
        }}
      />
    </div>
  );
}
