# Phase 4: Templates & Discovery - Research

**Researched:** 2026-01-28
**Domain:** Template gallery UI, static data patterns, template-to-generation flow
**Confidence:** HIGH

## Summary

This phase adds a template gallery where users can browse, preview, and select pre-made text animation templates as starting points for generation. The research focused on three key areas: (1) how to store and define templates, (2) gallery UI patterns using shadcn/ui, and (3) the flow from template selection to generation.

The recommended approach uses **hardcoded TypeScript templates** defined in a constants file with strong typing. This aligns with the existing props-based generation system (TextAnimationProps) and avoids the complexity of database-stored templates for v1.0. Templates are essentially pre-defined TextAnimationProps objects with metadata (name, description, category).

For the UI, shadcn/ui's Card component provides the gallery grid, Tabs component enables category filtering, and Dialog handles template preview modals. The existing PreviewPlayer component can be reused for template previews without modification.

**Primary recommendation:** Define templates as a typed TypeScript constant array in `src/lib/templates.ts`, use a responsive Card grid for the gallery, and pass the selected template's props directly to the generation flow as pre-filled context.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui Card | latest | Template cards in gallery | Already in project, composable API |
| shadcn/ui Tabs | latest | Category filtering | Clean tab-based filtering pattern |
| shadcn/ui Dialog | latest | Template preview modal | Accessible, keyboard-navigable modals |
| Remotion Player | 4.x | Template preview rendering | Already used in PreviewPlayer |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | latest | Icons for categories/actions | Already in project |
| tailwindcss | 4.x | Grid layout, responsive design | Already configured |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hardcoded templates | Convex DB templates | DB adds complexity, admin UI needed; hardcoded is simpler for v1.0 |
| Tabs for filtering | Select dropdown | Tabs are more visual, better for small category counts |
| Dialog preview | Inline expand | Dialog allows full-size preview with controls |

**Installation:**
```bash
# Card already installed, add Tabs and Dialog
npx shadcn@latest add tabs dialog
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   └── templates.ts          # Template definitions + types
├── components/
│   └── templates/
│       ├── template-gallery.tsx    # Main gallery with tabs + grid
│       ├── template-card.tsx       # Individual template card
│       └── template-preview.tsx    # Preview modal wrapper
├── app/
│   ├── templates/
│   │   └── page.tsx          # /templates route
│   └── create/
│       └── page.tsx          # Modified to accept template param
```

### Pattern 1: Static Template Definitions
**What:** Templates as typed TypeScript constants with metadata
**When to use:** When template count is small (<50) and doesn't need admin editing
**Example:**
```typescript
// src/lib/templates.ts
import type { TextAnimationProps } from "@/remotion/compositions/TextAnimation";

export interface Template {
  id: string;
  name: string;
  description: string;
  category: "social" | "business" | "creative" | "minimal";
  thumbnail?: string;  // Optional static preview image
  props: TextAnimationProps;
}

export const TEMPLATES: Template[] = [
  {
    id: "bold-announcement",
    name: "Bold Announcement",
    description: "Eye-catching scale animation for important messages",
    category: "social",
    props: {
      text: "Big News!",
      style: "scale",
      fontFamily: "Inter",
      fontSize: 72,
      color: "#FFFFFF",
      backgroundColor: "#FF5722",
      durationInFrames: 90,
      fps: 30,
    },
  },
  {
    id: "minimal-fade",
    name: "Minimal Fade",
    description: "Elegant fade-in for subtle, professional content",
    category: "minimal",
    props: {
      text: "Simple. Clean. Effective.",
      style: "fade-in",
      fontFamily: "Inter",
      fontSize: 48,
      color: "#333333",
      backgroundColor: "#FFFFFF",
      durationInFrames: 120,
      fps: 30,
    },
  },
  // ... more templates
] as const satisfies readonly Template[];

export const CATEGORIES = [
  { id: "all", label: "All Templates" },
  { id: "social", label: "Social Media" },
  { id: "business", label: "Business" },
  { id: "creative", label: "Creative" },
  { id: "minimal", label: "Minimal" },
] as const;

export type Category = typeof CATEGORIES[number]["id"];

export function getTemplatesByCategory(category: Category): Template[] {
  if (category === "all") return [...TEMPLATES];
  return TEMPLATES.filter((t) => t.category === category);
}

export function getTemplateById(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
```

### Pattern 2: Card-Based Gallery Grid
**What:** Responsive grid of template cards with hover previews
**When to use:** For browsable template collections
**Example:**
```typescript
// src/components/templates/template-card.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Template } from "@/lib/templates";

interface TemplateCardProps {
  template: Template;
  onSelect: (template: Template) => void;
  onPreview: (template: Template) => void;
}

export function TemplateCard({ template, onSelect, onPreview }: TemplateCardProps) {
  return (
    <Card
      className="cursor-pointer hover:ring-2 hover:ring-primary transition-all"
      onClick={() => onPreview(template)}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{template.name}</CardTitle>
        <CardDescription>{template.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Static color preview showing template colors */}
        <div
          className="aspect-video rounded-md flex items-center justify-center"
          style={{
            backgroundColor: template.props.backgroundColor || "#000",
            color: template.props.color
          }}
        >
          <span
            style={{
              fontFamily: template.props.fontFamily,
              fontSize: Math.min(template.props.fontSize / 3, 24)
            }}
          >
            {template.props.text.slice(0, 20)}...
          </span>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            className="flex-1 text-sm text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(template);
            }}
          >
            Preview
          </button>
          <button
            className="flex-1 text-sm text-primary font-medium"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(template);
            }}
          >
            Use Template
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Pattern 3: Template Preview Modal
**What:** Full-size animated preview in a dialog
**When to use:** Before user commits to using a template
**Example:**
```typescript
// src/components/templates/template-preview.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PreviewPlayer } from "@/components/preview/preview-player";
import type { Template } from "@/lib/templates";

interface TemplatePreviewProps {
  template: Template | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseTemplate: (template: Template) => void;
}

export function TemplatePreview({
  template,
  open,
  onOpenChange,
  onUseTemplate
}: TemplatePreviewProps) {
  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{template.name}</DialogTitle>
          <DialogDescription>{template.description}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <PreviewPlayer animationProps={template.props} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onUseTemplate(template)}>
            Use This Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Pattern 4: Template Selection Flow
**What:** Pass selected template to create page via URL params or state
**When to use:** When user selects "Use Template"
**Example:**
```typescript
// In template gallery - navigate with template ID
import { useRouter } from "next/navigation";

function handleUseTemplate(template: Template) {
  router.push(`/create?template=${template.id}`);
}

// In create page - read and apply template
import { useSearchParams } from "next/navigation";
import { getTemplateById } from "@/lib/templates";

export default function CreatePage() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template");

  // Get pre-filled template if provided
  const selectedTemplate = templateId ? getTemplateById(templateId) : null;

  // Use template props as initial context for generation
  // User can still enter a prompt to customize
}
```

### Anti-Patterns to Avoid
- **Storing templates in database for v1.0:** Adds complexity without benefit when template count is small and doesn't need dynamic editing
- **Generating previews on-the-fly in gallery:** Too heavy; use static color previews in cards, animated preview only in modal
- **Bypassing generation for templates:** Templates should pre-fill context for AI customization, not skip the generation pipeline

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Card grid layout | Custom CSS grid component | Tailwind grid utilities | Tailwind's grid is flexible and responsive |
| Tab filtering | Custom filter state | shadcn Tabs component | Accessible, keyboard-navigable, styled |
| Modal dialogs | Custom portal logic | shadcn Dialog | Handles focus trap, escape key, accessibility |
| Animation preview | New preview component | Existing PreviewPlayer | Already built and tested for this exact purpose |

**Key insight:** The existing PreviewPlayer component is a perfect fit for template previews. No new preview infrastructure needed.

## Common Pitfalls

### Pitfall 1: Heavy Gallery Load
**What goes wrong:** Loading Remotion Player for every template card kills performance
**Why it happens:** Temptation to show animated previews in the gallery grid
**How to avoid:** Use static color/text previews in cards; only load Player in modal preview
**Warning signs:** Slow gallery render, high memory usage

### Pitfall 2: Template Schema Drift
**What goes wrong:** Templates become invalid when TextAnimationProps schema changes
**Why it happens:** Templates defined separately from the schema that validates them
**How to avoid:** Templates use the same TextAnimationProps type; TypeScript catches drift at compile time
**Warning signs:** Runtime errors when rendering old templates

### Pitfall 3: Direct Template Rendering vs Generation
**What goes wrong:** Users expect templates to render directly without AI generation
**Why it happens:** Unclear UX about what "Use Template" means
**How to avoid:** Clear copy: "Use as starting point", prompt field remains visible, show that customization is possible
**Warning signs:** Users confused why they see a prompt input after selecting template

### Pitfall 4: Missing Category Filter State
**What goes wrong:** Category selection resets on navigation or re-render
**Why it happens:** Filter state stored only in component, lost on unmount
**How to avoid:** For v1, component state is fine (gallery is single page). If needed, use URL params (?category=social)
**Warning signs:** Users losing filter state

## Code Examples

### Gallery with Tabs Filtering
```typescript
// src/components/templates/template-gallery.tsx
"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TemplateCard } from "./template-card";
import { TemplatePreview } from "./template-preview";
import { TEMPLATES, CATEGORIES, type Template, type Category } from "@/lib/templates";
import { useRouter } from "next/navigation";

export function TemplateGallery() {
  const router = useRouter();
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [category, setCategory] = useState<Category>("all");

  const filteredTemplates = category === "all"
    ? TEMPLATES
    : TEMPLATES.filter((t) => t.category === category);

  const handleUseTemplate = (template: Template) => {
    router.push(`/create?template=${template.id}`);
  };

  return (
    <div className="space-y-6">
      <Tabs value={category} onValueChange={(v) => setCategory(v as Category)}>
        <TabsList>
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id}>
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onSelect={handleUseTemplate}
            onPreview={setPreviewTemplate}
          />
        ))}
      </div>

      <TemplatePreview
        template={previewTemplate}
        open={!!previewTemplate}
        onOpenChange={(open) => !open && setPreviewTemplate(null)}
        onUseTemplate={handleUseTemplate}
      />
    </div>
  );
}
```

### Modified Create Page with Template Support
```typescript
// src/app/create/page.tsx (modified)
"use client";

import { useSearchParams } from "next/navigation";
import { getTemplateById } from "@/lib/templates";
// ... existing imports

export default function CreatePage() {
  const searchParams = useSearchParams();
  const templateId = searchParams.get("template");
  const selectedTemplate = templateId ? getTemplateById(templateId) : null;

  // Show template context if selected
  // Pre-fill prompt with template description or allow customization

  return (
    // ... existing layout
    <Authenticated>
      {selectedTemplate && (
        <div className="mb-4 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            Using template: <strong>{selectedTemplate.name}</strong>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Customize with your own text and style below
          </p>
        </div>
      )}
      <CreateContent initialTemplate={selectedTemplate} />
    </Authenticated>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CMS-stored templates | Code-defined templates with TypeScript | 2024 | Type safety, no external dependencies |
| Carousel galleries | Grid with filtering tabs | 2023 | Better discoverability, mobile-friendly |
| Full animation in cards | Static preview + modal animation | 2024 | Performance, reduced resource usage |

**Deprecated/outdated:**
- None relevant for this phase; patterns are well-established

## Open Questions

1. **Optimal template count for v1.0**
   - What we know: 8-12 templates covers main use cases
   - What's unclear: Exact templates to include
   - Recommendation: Start with 8 diverse templates across 4 categories; can expand based on user feedback

2. **Template thumbnails (static images) vs color previews**
   - What we know: Static thumbnails load faster but need generation
   - What's unclear: Whether color previews are sufficient for decision-making
   - Recommendation: Start with color previews (no asset pipeline needed); add thumbnails later if conversion suffers

3. **Template versioning**
   - What we know: Templates may need updates over time
   - What's unclear: How to handle templates users have already used
   - Recommendation: For v1.0, templates are ephemeral (just props). No versioning needed until templates are stored.

## Sources

### Primary (HIGH confidence)
- [shadcn/ui Card](https://ui.shadcn.com/docs/components/card) - Card component API
- [shadcn/ui Tabs](https://ui.shadcn.com/docs/components/tabs) - Tabs filtering pattern
- [shadcn/ui Dialog](https://ui.shadcn.com/docs/components/dialog) - Modal preview pattern
- Existing codebase: TextAnimation.tsx, PreviewPlayer.tsx - Verified props schema

### Secondary (MEDIUM confidence)
- [Remotion Templates Gallery](https://www.remotion.dev/templates/) - Template gallery UI pattern
- [Convex Seeding Data](https://stack.convex.dev/seeding-data-for-preview-deployments) - Static data patterns
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html) - Constants patterns

### Tertiary (LOW confidence)
- General UX patterns for template selection - Multiple sources agree on grid + filter + preview modal

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing shadcn/ui components already in project
- Architecture: HIGH - Patterns verified against official docs and existing codebase
- Pitfalls: MEDIUM - Based on general React/Remotion patterns, not specific to this app

**Research date:** 2026-01-28
**Valid until:** 60 days (patterns are stable, shadcn/ui is mature)
