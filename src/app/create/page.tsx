import { getTemplateById, type Template } from "@/lib/templates";
import { CreatePageClient } from "./create-page-client";

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const params = await searchParams;
  const templateId = params.template;
  const selectedTemplate = templateId ? getTemplateById(templateId) ?? null : null;

  return <CreatePageClient selectedTemplate={selectedTemplate} />;
}
