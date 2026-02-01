# Features Research: RemotionLab v0.2.0

**Focus:** UX patterns and feature implementations for Create Page Overhaul
**Researched:** 2026-02-01

## 1. Midjourney-style Generation Feed

### Layout Structure
Midjourney's Create page is a scrolling feed of all generations:
- Each generation is a **row** with: image grid on the left, prompt text + metadata on the right
- 4 images per generation displayed in a `grid-template-columns: repeat(4, minmax(0px, 1fr))` grid
- Newest generations appear at the top
- Hovering over an image reveals shortcut buttons (trash, like, vary, video)
- Right side shows: prompt text, parameters, reference images used

### Loading/In-Progress States
- During generation, a placeholder row appears with progress indication
- Images render progressively (blurry → clear) as generation completes
- The generation appears at the top of the feed immediately

### Timeline Scroll Bar
- Thin gray bar on the side showing dates of generations
- Click a date to jump to that day's generations

### For RemotionLab Adaptation
- Each generation row: variation grid (1-4 Remotion thumbnails) on left, prompt + settings on right
- In-progress state: skeleton/shimmer placeholders for thumbnails, spinning indicator
- Click a variation to expand into full preview + editor view

## 2. Variation Selection UX

### Midjourney Pattern
- 4 variations displayed as equal-size thumbnails in a 2x2 or 1x4 grid
- Click any variation to open full-size view with editing tools
- V1/V2/V3/V4 buttons to create further variations from a specific one
- U1/U2/U3/U4 buttons to upscale a specific variation

### DALL-E Pattern
- Shows 1-4 images in a horizontal row
- Click to select, then download/edit/share
- "Variations" button generates new set based on selected

### For RemotionLab Adaptation
- Display 1-4 variation thumbnails in a grid row (1 col for 1 var, 2 cols for 2, 2x2 for 4)
- Click a variation to select it — shows full preview in expanded view
- Selected variation becomes the "active" one for actions (save, extend, edit)
- Variation index badges (V1, V2, V3, V4) on thumbnails

## 3. Settings Panel UX

### Midjourney Settings
- Toggleable from the input bar (gear icon)
- Settings include: Image Size (Portrait/Square/Landscape + custom ratio slider), Model version, Stylization, Weirdness, Variety, Speed/Quality mode
- Settings persist across generations (sticky defaults)

### Runway/Pika Settings
- Resolution, duration, aspect ratio, camera motion presets
- Collapsed by default, expand via button near prompt input

### For RemotionLab Settings
Three settings needed:
1. **Aspect Ratio**: Portrait (9:16) / Square (1:1) / Landscape (16:9) — toggle buttons, not slider
2. **Duration**: Slider or number input (1-30 seconds, default 5)
3. **FPS**: Dropdown (24/30/60, default 30)

**Panel behavior:**
- Toggle via gear icon button in input bar
- Panel appears above or below input bar (popover/dropdown)
- Settings persist in localStorage as user defaults
- Each generation stores the settings used

## 4. Per-Creation Actions

### Midjourney Actions (per image)
- **Upscale** (Subtle/Creative) — not applicable to video
- **Vary** (Subtle/Strong) — create variations from this specific result
- **Remix** — edit prompt and regenerate with this as reference
- **Pan/Zoom** — expand canvas — not applicable
- **Trash** — delete from feed
- **Like/Save** — save to collections

### For RemotionLab Actions (per generation/variation)
- **Extend Next** (existing continuation) — generate animation continuing from end state
- **Extend Previous** (new prequel) — generate animation leading into start state
- **Save** — save to clip library (opens save dialog)
- **Delete** — remove from feed (with confirmation)
- **Rerun** — regenerate with same prompt and settings
- **Edit** — open in code editor view for manual editing
- **Add to Movie** — add selected variation to a movie timeline

**Button placement:**
- Hover overlay on thumbnails for quick actions (save, delete)
- Action bar below expanded variation for full actions (extend next/prev, rerun, edit, add to movie)

## 5. Prequel Generation UX

### Industry Precedent
- **Runway Gen-2/Gen-3**: Has "Extend" feature that continues video forward. No "extend backward" feature found.
- **Pika**: Has "Extend" for forward continuation only.
- **Midjourney**: Pan feature extends image in a direction, but not temporal prequel.

### Prequel is Novel
No major AI video tool offers "generate what comes before." This is a RemotionLab differentiator.

### UX Recommendations
- Button label: "Extend Previous" or "Generate Prequel"
- Icon: Arrow pointing left (← ) or backward
- Tooltip: "Generate an animation that leads into this clip's opening state"
- Flow: Click → system extracts start state (frame 0) → generates new animation → appears as new generation in feed with "prequel of [clip name]" label
- The prequel can then be added before the original clip in a movie timeline

## 6. File/Image Upload UX

### ChatGPT Pattern
- Paperclip icon in input bar
- Click to open file picker, or drag-and-drop onto input area
- Uploaded file shows as thumbnail chip in the input area
- Multiple files supported
- Image preview with X button to remove

### Midjourney Pattern
- Image URL pasting in prompt
- Upload via /imagine command with image attachment
- Reference images shown alongside prompt text in feed

### For RemotionLab Adaptation
- **Upload button** (image icon) in input bar, left of send button
- Click opens file picker (accept: image/*)
- **Drag-and-drop** onto input area
- **Paste** support (Ctrl+V image from clipboard)
- Uploaded image shows as **thumbnail chip** in input bar area
- X button to remove before sending
- Max 1-3 images per prompt
- Image stored in Convex file storage, passed to Claude as visual reference
- In feed: reference images shown alongside prompt text
