"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface DownloadButtonProps {
  url: string;
  filename?: string;
}

export function DownloadButton({ url, filename = "animation.mp4" }: DownloadButtonProps) {
  const handleDownload = () => {
    // Create a temporary link and trigger download
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank"; // Opens in new tab if download fails
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button onClick={handleDownload} className="gap-2">
      <Download className="h-4 w-4" />
      Download MP4
    </Button>
  );
}
