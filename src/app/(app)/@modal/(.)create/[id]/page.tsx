"use client";

import { use } from "react";
import { CreationFullscreenModal } from "@/components/creation/creation-fullscreen-modal";

interface ModalPageProps {
  params: Promise<{ id: string }>;
}

export default function CreationModalPage({ params }: ModalPageProps) {
  const { id } = use(params);
  return <CreationFullscreenModal generationId={id} />;
}
