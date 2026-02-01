"use client";

import { useRef } from "react";
import { X, Loader2, AlertCircle, Plus } from "lucide-react";
import type { AttachedImage } from "@/hooks/use-image-upload";

interface ImageAttachmentProps {
  images: AttachedImage[];
  onRemove: (id: string) => void;
  onAddFiles: (files: File[]) => void;
  disabled?: boolean;
  maxImages?: number;
}

export function ImageAttachment({
  images,
  onRemove,
  onAddFiles,
  disabled = false,
  maxImages = 3,
}: ImageAttachmentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onAddFiles(Array.from(files));
    }
    // Reset input so re-selecting same file triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (images.length === 0 && disabled) return null;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {images.map((image) => (
        <div key={image.id} className="relative group">
          <img
            src={image.previewUrl}
            alt="Reference"
            className="h-12 w-12 rounded-md object-cover"
          />

          {/* Uploading overlay */}
          {image.status === "uploading" && (
            <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/50">
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            </div>
          )}

          {/* Error overlay */}
          {image.status === "error" && (
            <div className="absolute inset-0 flex items-center justify-center rounded-md bg-red-500/50">
              <AlertCircle className="h-4 w-4 text-white" />
            </div>
          )}

          {/* Remove button */}
          <button
            type="button"
            onClick={() => onRemove(image.id)}
            className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
            aria-label="Remove image"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}

      {/* Add more button */}
      {images.length < maxImages && !disabled && (
        <>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-12 w-12 items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30 text-muted-foreground/50 hover:border-muted-foreground/50 hover:text-muted-foreground/70 transition-colors"
            aria-label="Add image"
          >
            <Plus className="h-5 w-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      )}
    </div>
  );
}
