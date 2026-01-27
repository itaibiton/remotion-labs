"use client";

import { Eye, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import type { Template } from "@/lib/templates";

interface TemplateCardProps {
  template: Template;
  onSelect: (template: Template) => void;
  onPreview: (template: Template) => void;
}

export function TemplateCard({ template, onSelect, onPreview }: TemplateCardProps) {
  const { props } = template;

  // Truncate long text for static preview
  const previewText =
    props.text.length > 20 ? props.text.slice(0, 20) + "..." : props.text;

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onPreview(template)}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{template.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {template.description}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Static color preview */}
        <div
          className="aspect-video rounded-lg flex items-center justify-center overflow-hidden"
          style={{
            backgroundColor: props.backgroundColor || "#000000",
            color: props.color,
          }}
        >
          <span
            className="text-center px-4 font-medium"
            style={{
              fontSize: `clamp(12px, ${props.fontSize / 6}px, 24px)`,
            }}
          >
            {previewText}
          </span>
        </div>
      </CardContent>

      <CardFooter className="gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            onPreview(template);
          }}
        >
          <Eye className="h-4 w-4 mr-1" />
          Preview
        </Button>
        <Button
          size="sm"
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(template);
          }}
        >
          Use Template
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
}
