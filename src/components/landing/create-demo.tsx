"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const EXAMPLE_PROMPTS = [
  "A logo reveal with particles exploding outward",
  "Animated bar chart showing growth metrics",
  "Text typing effect with glowing cursor",
  "3D rotating product showcase",
  "Smooth gradient wave animation",
];

export function CreateDemo() {
  const [prompt, setPrompt] = useState("");
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const { isSignedIn } = useAuth();
  const router = useRouter();

  // Rotate placeholder text
  useState(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % EXAMPLE_PROMPTS.length);
    }, 3000);
    return () => clearInterval(interval);
  });

  const handleCreate = () => {
    if (isSignedIn) {
      router.push(`/create?prompt=${encodeURIComponent(prompt)}`);
    }
  };

  return (
    <section id="try-it" className="py-24 px-4 relative">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Try It <span className="text-violet-400">Now</span>
          </h2>
          <p className="text-gray-400 text-lg">
            Describe your animation and watch the magic happen
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          {/* Main card */}
          <div className="relative bg-gradient-to-b from-white/[0.08] to-white/[0.02] rounded-2xl border border-white/10 p-8 backdrop-blur-xl">
            {/* Glow effect on card */}
            <div className="absolute -inset-px bg-gradient-to-r from-violet-500/50 via-purple-500/50 to-cyan-500/50 rounded-2xl blur-lg opacity-20 -z-10" />
            
            <div className="space-y-6">
              {/* Input area */}
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={EXAMPLE_PROMPTS[currentPlaceholder]}
                  className="w-full h-32 bg-black/30 rounded-xl border border-white/10 px-5 py-4 text-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 resize-none transition-all"
                />
                <div className="absolute bottom-4 right-4 text-xs text-gray-500">
                  {prompt.length} / 500
                </div>
              </div>

              {/* Action row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span>AI-powered generation</span>
                </div>

                {isSignedIn ? (
                  <Button
                    onClick={handleCreate}
                    disabled={!prompt.trim()}
                    className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white px-6 py-5 text-lg rounded-xl shadow-lg shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Wand2 className="mr-2 w-5 h-5" />
                    Generate Animation
                  </Button>
                ) : (
                  <SignInButton mode="modal">
                    <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white px-6 py-5 text-lg rounded-xl shadow-lg shadow-violet-500/25">
                      <Wand2 className="mr-2 w-5 h-5" />
                      Sign In to Create
                    </Button>
                  </SignInButton>
                )}
              </div>
            </div>
          </div>

          {/* Quick prompts */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm text-gray-500 mr-2">Try:</span>
            {EXAMPLE_PROMPTS.slice(0, 3).map((p, i) => (
              <button
                key={i}
                onClick={() => setPrompt(p)}
                className="px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-gray-400 hover:text-white transition-all"
              >
                {p.slice(0, 30)}...
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
