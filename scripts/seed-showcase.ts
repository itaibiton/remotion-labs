#!/usr/bin/env npx tsx
/**
 * Seed the explore feed with 50 showcase animations.
 *
 * Usage:
 *   SEED_USER_ID="your-clerk-token-identifier" npx tsx scripts/seed-showcase.ts
 *
 * Prerequisites:
 *   - Convex dev server running (`npx convex dev`)
 *   - ANTHROPIC_API_KEY set in Convex environment
 *   - A valid userId (tokenIdentifier from Clerk — find it in Convex dashboard)
 *
 * Processes prompts in batches of 10 via `npx convex run` to stay within
 * Convex action timeout limits (~2 min per batch).
 */

import { execSync } from "child_process";

// --- Configuration -----------------------------------------------------------

const USER_ID = process.env.SEED_USER_ID;
if (!USER_ID) {
  console.error("Error: SEED_USER_ID not set.");
  console.error("  Set it to your Clerk tokenIdentifier, e.g.:");
  console.error('  SEED_USER_ID="https://your-clerk-domain|user_..." npx tsx scripts/seed-showcase.ts');
  process.exit(1);
}

// --- 50 Showcase Prompts -----------------------------------------------------

const PROMPTS: string[] = [
  // --- Kinetic Typography (10) ---
  "Bold white text 'HELLO WORLD' on black background that scales up from 0 with a spring bounce, then each letter rotates individually",
  "Typewriter effect revealing 'The Future Is Now' character by character with a blinking cursor, monospace green-on-black terminal style",
  "Word 'CREATIVITY' where each letter falls from above with staggered spring physics, landing with a satisfying bounce",
  "Cinematic title reveal: 'CHAPTER ONE' fades in with a horizontal line expanding from center, elegant serif styling",
  "Text 'BOOM' that starts tiny in the center and explodes outward with scaling and rotation, comic book style with bold colors",
  "Gradient text 'MOTION' that shimmers with a traveling highlight wave, purple-to-pink gradient on dark background",
  "Split screen reveal: 'DESIGN' on the left slides in from left, 'CODE' on the right slides in from right, they meet in the middle",
  "Counting number animation from 0 to 100 with a circular progress ring that fills as the number increases, clean modern style",
  "Stacked word stack: words 'Build. Ship. Scale.' appear one after another sliding up, each in a different accent color",
  "Glitch text effect: 'ERROR 404' with RGB split, scanline overlay, and random position jitter, retro CRT monitor aesthetic",

  // --- Geometric / Abstract (10) ---
  "Concentric circles that expand outward like ripples in water, alternating between blue and white, pulsing rhythmically",
  "Grid of 16 squares that rotate in a wave pattern, each offset by a few frames, creating a mesmerizing domino effect",
  "Single dot that traces a perfect infinity symbol (lemniscate) path, leaving a fading trail behind it, neon green on black",
  "Rotating 3D-like cube illusion using only 2D transforms: three parallelograms animating to look like a spinning cube",
  "Particle explosion: 50 small circles burst from center in all directions with varying speeds and sizes, fading as they travel",
  "Morphing shape: circle smoothly transforms into a square, then into a triangle, then back to circle, using border-radius tricks",
  "Pendulum wave: 15 circles swinging back and forth at slightly different frequencies creating wave interference patterns",
  "Spiral of rotating squares that grow from center, each rotated slightly more than the last, forming a golden ratio spiral",
  "Breathing animation: a large circle gently expands and contracts like breathing, with a soft gradient that shifts colors",
  "Loading spinner made of 8 dots arranged in a circle, each fading in and out sequentially with smooth opacity transitions",

  // --- Data Visualization (8) ---
  "Animated bar chart with 5 bars growing from bottom to their values sequentially, each bar a different color, with labels",
  "Pie chart that draws itself segment by segment, rotating into view, with 4 segments in brand colors and percentage labels",
  "Line graph drawing itself from left to right, plotting a sine wave with dots at each data point that pop in with spring animation",
  "Donut chart with animated stroke-dashoffset drawing 3 colored segments, center shows total '85%' fading in",
  "Horizontal progress bars: 4 skill bars filling to different widths with labels (React 90%, TypeScript 85%, CSS 95%, Node 80%)",
  "Animated counter dashboard: 3 cards side by side, each with a number counting up to a different value with subtle shadow",
  "Scatter plot where 20 dots fall from top and settle into their data positions with spring physics",
  "Stacked area chart drawing from left to right with 3 layers in semi-transparent colors, smooth curves",

  // --- Logo / Brand (7) ---
  "Logo reveal: a circle draws itself (stroke animation), then a lightning bolt appears inside with a flash effect",
  "Minimalist logo animation: two overlapping circles slide apart revealing the text 'STUDIO' in the gap between them",
  "Letter 'A' constructed from geometric lines that draw themselves one stroke at a time, architectural blueprint style",
  "Abstract logo: 3 overlapping rounded rectangles rotate into alignment from scattered positions, forming a unified mark",
  "Heartbeat logo animation: a heart shape that pulses with an ECG line drawing across the screen, medical-tech style",
  "Startup logo intro: rocket icon flies up from bottom leaving a gradient trail, company name 'LAUNCH' types out below",
  "Music logo: sound wave bars (5 vertical lines) animating up and down at different heights like an audio equalizer",

  // --- Scene / Storytelling (8) ---
  "Day-to-night transition: sky gradient shifts from blue to dark navy, a yellow sun circle descends as a white moon rises",
  "Animated weather card: clouds drift across, rain drops fall with randomized paths, temperature reads '72F' with a thermometer",
  "Solar system: small colored circles orbiting a yellow center circle at different speeds and distances, top-down view",
  "City skyline silhouette that builds itself: rectangles of varying heights rise from the bottom one by one, stars twinkle above",
  "Animated clock: hour and minute hands rotate at proper speeds, with tick marks around the edge drawing in first",
  "Ocean waves: layered sine waves in different blues animating horizontally at different speeds creating a parallax water effect",
  "Fireworks display: 3 rockets launch upward at staggered times, each exploding into radiating dots that fade out",
  "Retro arcade: 'GAME OVER' text drops in with pixel font, score counter rapidly counts up, 'INSERT COIN' blinks at bottom",

  // --- UI / Product (7) ---
  "Mobile app notification: card slides down from top with avatar, title, and message text, then slides back up after 2 seconds",
  "Pricing table animation: 3 cards flip in from different angles, the middle 'Pro' card is highlighted and slightly larger",
  "Toggle switch animation: a rounded pill shape where the knob slides from left to right, background transitions from gray to green",
  "Card stack: 3 overlapping cards spread out in a fan arrangement, each tilted slightly, revealing content underneath",
  "Onboarding dots: 3 step indicator dots where the active dot grows larger and changes color as progress advances left to right",
  "Floating action button that morphs: circle expands into a rounded rectangle menu with 3 icon options spreading outward",
  "Like button animation: heart icon scales up with a burst of tiny particle dots when clicked, red fill sweeps upward",
];

// --- Execution ---------------------------------------------------------------

const BATCH_SIZE = 10;

function main() {
  console.log(`\nSeeding ${PROMPTS.length} showcase prompts in batches of ${BATCH_SIZE}...`);
  console.log(`User ID: ${USER_ID!.slice(0, 50)}...`);
  console.log();

  const batches: string[][] = [];
  for (let i = 0; i < PROMPTS.length; i += BATCH_SIZE) {
    batches.push(PROMPTS.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < batches.length; i++) {
    const args = JSON.stringify({
      userId: USER_ID,
      prompts: batches[i],
    });

    console.log(`━━━ Batch ${i + 1}/${batches.length} (${batches[i].length} prompts) ━━━`);

    try {
      execSync(
        `npx convex run --no-push generateAnimation:seedShowcase '${args.replace(/'/g, "'\\''")}'`,
        {
          stdio: "inherit",
          cwd: process.cwd(),
          timeout: 10 * 60 * 1000, // 10 min per batch
        }
      );
      console.log(`✓ Batch ${i + 1} complete\n`);
    } catch (e) {
      console.error(`✗ Batch ${i + 1} failed:`, e instanceof Error ? e.message : e);
      console.error("  Continuing with next batch...\n");
    }
  }

  console.log("Done! Check /feed to see results.");
}

main();
