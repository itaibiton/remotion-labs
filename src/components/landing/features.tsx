"use client";

import { motion } from "framer-motion";
import { 
  Wand2, 
  Layers, 
  Sliders, 
  Image, 
  Zap, 
  Download,
  Code2,
  Film
} from "lucide-react";

const FEATURES = [
  {
    icon: Wand2,
    title: "AI Code Generation",
    description: "Claude generates actual Remotion JSX code from your prompts. Full control, real animations.",
    color: "from-violet-500 to-purple-600",
    size: "large",
  },
  {
    icon: Layers,
    title: "Timeline Editor",
    description: "Pro-style timeline with trim, split, and zoom. Edit like a pro.",
    color: "from-cyan-500 to-blue-600",
    size: "medium",
  },
  {
    icon: Sliders,
    title: "Variations",
    description: "Generate 1-4 different versions per prompt. Pick your favorite.",
    color: "from-orange-500 to-red-600",
    size: "medium",
  },
  {
    icon: Image,
    title: "Image Context",
    description: "Upload reference images to guide the AI generation.",
    color: "from-pink-500 to-rose-600",
    size: "small",
  },
  {
    icon: Zap,
    title: "Lambda Rendering",
    description: "Fast cloud rendering powered by AWS Lambda.",
    color: "from-yellow-500 to-amber-600",
    size: "small",
  },
  {
    icon: Download,
    title: "Export Options",
    description: "Download MP4 or full Remotion project scaffold.",
    color: "from-green-500 to-emerald-600",
    size: "small",
  },
  {
    icon: Code2,
    title: "Code Editing",
    description: "Monaco editor with live preview. Fine-tune every detail.",
    color: "from-indigo-500 to-blue-600",
    size: "medium",
  },
  {
    icon: Film,
    title: "Movie Mode",
    description: "Chain multiple clips into full movies with AI-generated continuations.",
    color: "from-purple-500 to-violet-600",
    size: "medium",
  },
];

function FeatureCard({ feature, index }: { feature: typeof FEATURES[0]; index: number }) {
  const Icon = feature.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -5 }}
      className={`group relative bg-gradient-to-b from-white/[0.08] to-white/[0.02] rounded-2xl border border-white/10 p-6 hover:border-white/20 transition-all ${
        feature.size === "large" ? "md:col-span-2 md:row-span-2" : 
        feature.size === "medium" ? "md:col-span-1 md:row-span-1" : ""
      }`}
    >
      {/* Hover glow */}
      <div className={`absolute -inset-px bg-gradient-to-r ${feature.color} rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity`} />
      
      <div className="relative">
        {/* Icon */}
        <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} mb-4`}>
          <Icon className="w-6 h-6 text-white" />
        </div>

        {/* Content */}
        <h3 className={`font-semibold text-white mb-2 ${feature.size === "large" ? "text-2xl" : "text-lg"}`}>
          {feature.title}
        </h3>
        <p className={`text-gray-400 ${feature.size === "large" ? "text-lg" : "text-sm"}`}>
          {feature.description}
        </p>

        {/* Large card extra content */}
        {feature.size === "large" && (
          <div className="mt-6 grid grid-cols-3 gap-4">
            {["Prompts", "Code", "Video"].map((step, i) => (
              <div key={step} className="text-center">
                <div className="text-2xl font-bold text-violet-400">{i + 1}</div>
                <div className="text-sm text-gray-500">{step}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function Features() {
  return (
    <section className="py-24 px-4 relative">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-600/5 via-transparent to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Powerful <span className="text-violet-400">Features</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Everything you need to create professional motion graphics, without the complexity.
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-fr">
          {FEATURES.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
