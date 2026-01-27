"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemplateCard } from "@/components/templates/template-card";
import { TemplatePreview } from "@/components/templates/template-preview";
import { CATEGORIES, getTemplatesByCategory, type CategoryId, type Template } from "@/lib/templates";

export function TemplateGallery() {
  const [category, setCategory] = useState<CategoryId>("all");
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  const filteredTemplates = getTemplatesByCategory(category);

  const handlePreview = (template: Template) => {
    setPreviewTemplate(template);
  };

  const handleUseTemplate = (template: Template) => {
    // Will be wired up in Plan 02 to navigate with template data
    console.log("Use template:", template.id);
  };

  return (
    <div className="space-y-6">
      <Tabs
        value={category}
        onValueChange={(value) => setCategory(value as CategoryId)}
      >
        <TabsList>
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map((cat) => (
          <TabsContent key={cat.id} value={cat.id}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleUseTemplate}
                  onPreview={handlePreview}
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <TemplatePreview
        template={previewTemplate}
        open={previewTemplate !== null}
        onOpenChange={(open) => !open && setPreviewTemplate(null)}
        onUseTemplate={handleUseTemplate}
      />
    </div>
  );
}
