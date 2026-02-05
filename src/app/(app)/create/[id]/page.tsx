"use client";

import { use } from "react";
import { CreationFullscreenModal } from "@/components/creation/creation-fullscreen-modal";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function Page({ params }: PageProps) {
  const { id } = use(params);
  return <CreationFullscreenModal generationId={id} />;
}
