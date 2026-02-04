"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Play } from "lucide-react";

const SHOWCASE_ITEMS = [
  {
    title: "Logo Reveal",
    description: "Particle explosion effect",
    color: "from-violet-500 to-purple-600",
    category: "Branding",
  },
  {
    title: "Data Visualization",
    description: "Animated bar chart",
    color: "from-cyan-500 to-blue-600",
    category: "Business",
  },
  {
    title: "Product Launch",
    description: "3D rotation showcase",
    color: "from-orange-500 to-red-600",
    category: "Marketing",
  },
  {
    title: "Social Media",
    description: "Story animation",
    color: "from-pink-500 to-rose-600",
    category: "Content",
  },
  {
    title: "Tutorial Intro",
    description: "Text reveal effect",
    color: "from-green-500 to-emerald-600",
    category: "Education",
  },
  {
    title: "App Promo",
    description: "Feature showcase",
    color: "from-yellow-500 to-amber-600",
    category: "Tech",
  },
];

function GalleryCard({ item, index }: { item: typeof SHOWCASE_ITEMS[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -10, scale: 1.02 }}
      className="group relative"
    >
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10">
        {/* Animated gradient background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-20 group-hover:opacity-40 transition-opacity`} />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30"
          >
            <Play className="w-7 h-7 text-white ml-1" />
          </motion.div>
        </div>

        {/* Category badge */}
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1 text-xs font-medium bg-black/40 backdrop-blur-md rounded-full text-white/80 border border-white/10">
            {item.category}
          </span>
        </div>

        {/* Animated elements placeholder */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className={`w-20 h-20 rounded-xl bg-gradient-to-br ${item.color} opacity-60 blur-sm`}
          />
        </div>
      </div>

      {/* Card info */}
      <div className="mt-4">
        <h3 className="text-lg font-semibold text-white">{item.title}</h3>
        <p className="text-sm text-gray-400">{item.description}</p>
      </div>
    </motion.div>
  );
}

export function Gallery() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 50]);

  return (
    <section ref={containerRef} className="py-24 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            See What&apos;s <span className="text-violet-400">Possible</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Explore animations created by our community. All generated from simple text prompts.
          </p>
        </motion.div>

        {/* Parallax grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SHOWCASE_ITEMS.map((item, index) => (
            <motion.div
              key={item.title}
              style={{ y: index % 2 === 0 ? y1 : y2 }}
            >
              <GalleryCard item={item} index={index} />
            </motion.div>
          ))}
        </div>

        {/* View more */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <button className="px-6 py-3 text-violet-400 hover:text-violet-300 font-medium transition-colors">
            View More Examples →
          </button>
        </motion.div>
      </div>
    </section>
  );
}
