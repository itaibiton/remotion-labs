"use client";

import { motion } from "framer-motion";
import { MessageSquare, Sparkles, Download, ArrowRight } from "lucide-react";

const STEPS = [
  {
    icon: MessageSquare,
    title: "Describe Your Vision",
    description: "Write a simple text prompt describing the animation you want. No technical jargon needed.",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: Sparkles,
    title: "AI Generates Code",
    description: "Claude AI creates professional Remotion code. Get multiple variations to choose from.",
    color: "from-cyan-500 to-blue-600",
  },
  {
    icon: Download,
    title: "Export & Share",
    description: "Download as MP4 or get the full source code. Use it anywhere you need.",
    color: "from-green-500 to-emerald-600",
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl -translate-y-1/2" />
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2" />
      </div>

      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            How It <span className="text-violet-400">Works</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Three simple steps to create professional motion graphics
          </p>
        </motion.div>

        <div className="relative">
          {/* Connection line */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500/20 via-cyan-500/20 to-green-500/20 -translate-y-1/2" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  className="relative"
                >
                  {/* Card */}
                  <div className="relative bg-gradient-to-b from-white/[0.08] to-white/[0.02] rounded-2xl border border-white/10 p-8 text-center">
                    {/* Step number */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${step.color} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                        {index + 1}
                      </div>
                    </div>

                    {/* Icon */}
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${step.color} mb-6`}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </motion.div>

                    <h3 className="text-xl font-semibold text-white mb-3">
                      {step.title}
                    </h3>
                    <p className="text-gray-400">
                      {step.description}
                    </p>
                  </div>

                  {/* Arrow (between cards) */}
                  {index < STEPS.length - 1 && (
                    <div className="hidden md:flex absolute top-1/2 -right-6 -translate-y-1/2 z-10">
                      <ArrowRight className="w-6 h-6 text-white/20" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Demo video placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          id="demo"
          className="mt-16"
        >
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-cyan-500/10" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 mx-auto mb-4 cursor-pointer hover:bg-white/20 transition-colors"
                >
                  <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-white border-b-8 border-b-transparent ml-1" />
                </motion.div>
                <p className="text-gray-400">Watch the demo</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
