"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { validateImageFile, stripExifAndResize, MAX_IMAGES } from "@/lib/image-utils";
import { toast } from "sonner";

export interface AttachedImage {
  id: string;
  file: File;
  previewUrl: string;
  status: "pending" | "uploading" | "uploaded" | "error";
}

export function useImageUpload(maxImages: number = MAX_IMAGES) {
  const [images, setImages] = useState<AttachedImage[]>([]);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  // Ref for cleanup on unmount (avoids stale closure over images state)
  const imagesRef = useRef<AttachedImage[]>([]);
  imagesRef.current = images;

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
  }, []);

  const addImages = useCallback(
    (files: File[]) => {
      const validFiles: File[] = [];

      for (const file of files) {
        const validation = validateImageFile(file);
        if (!validation.valid) {
          toast.error(validation.error);
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length === 0) return;

      setImages((prev) => {
        const slotsAvailable = maxImages - prev.length;
        if (slotsAvailable <= 0) {
          toast.error(`Maximum ${maxImages} images allowed`);
          return prev;
        }

        const filesToAdd = validFiles.slice(0, slotsAvailable);
        if (filesToAdd.length < validFiles.length) {
          toast.error(`Maximum ${maxImages} images allowed`);
        }

        const newImages: AttachedImage[] = filesToAdd.map((file) => ({
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
          status: "pending" as const,
        }));

        return [...prev, ...newImages];
      });
    },
    [maxImages],
  );

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const image = prev.find((img) => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }
      return prev.filter((img) => img.id !== id);
    });
  }, []);

  const uploadAll = useCallback(async (): Promise<string[]> => {
    const storageIds: string[] = [];

    for (const image of imagesRef.current) {
      if (image.status !== "pending") continue;

      // Set status to uploading
      setImages((prev) =>
        prev.map((img) =>
          img.id === image.id ? { ...img, status: "uploading" as const } : img,
        ),
      );

      try {
        const blob = await stripExifAndResize(image.file);
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: "POST",
          headers: { "Content-Type": blob.type || "image/jpeg" },
          body: blob,
        });

        if (!result.ok) {
          throw new Error(`Upload failed with status ${result.status}`);
        }

        const { storageId } = (await result.json()) as { storageId: string };
        storageIds.push(storageId);

        // Set status to uploaded
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id ? { ...img, status: "uploaded" as const } : img,
          ),
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Upload failed";
        toast.error(message);

        // Set status to error
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id ? { ...img, status: "error" as const } : img,
          ),
        );
      }
    }

    return storageIds;
  }, [generateUploadUrl]);

  const clear = useCallback(() => {
    imagesRef.current.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
  }, []);

  return { images, addImages, removeImage, uploadAll, clear };
}
