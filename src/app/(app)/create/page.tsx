import { getTemplateById } from "@/lib/templates";
import { CreatePageClient } from "./create-page-client";

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; clipId?: string; sourceClipId?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const templateId = params.template;
  const selectedTemplate = templateId ? getTemplateById(templateId) ?? null : null;

  return (
    <CreatePageClient
      selectedTemplate={selectedTemplate}
      clipId={params.clipId}
      sourceClipId={params.sourceClipId}
      mode={params.mode}
    />
  );
}
