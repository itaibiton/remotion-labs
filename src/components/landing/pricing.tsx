"use client";

import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignInButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for trying out",
    features: [
      "5 renders per month",
      "720p export quality",
      "Basic templates",
      "Community support",
      "Watermark on exports",
    ],
    cta: "Get Started",
    popular: false,
    color: "from-gray-500 to-gray-600",
  },
  {
    name: "Pro",
    price: "$29",
    period: "per month",
    description: "For creators and professionals",
    features: [
      "100 renders per month",
      "4K export quality",
      "All templates",
      "Priority support",
      "No watermark",
      "Code export",
      "Custom branding",
      "API access",
    ],
    cta: "Start Free Trial",
    popular: true,
    color: "from-violet-500 to-purple-600",
  },
  {
    name: "Team",
    price: "$99",
    period: "per month",
    description: "For teams and agencies",
    features: [
      "Unlimited renders",
      "4K export quality",
      "All Pro features",
      "Team collaboration",
      "Dedicated support",
      "White-label option",
      "Custom integrations",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    popular: false,
    color: "from-cyan-500 to-blue-600",
  },
];

function PricingCard({ plan, index }: { plan: typeof PLANS[0]; index: number }) {
  const { isSignedIn } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`relative ${plan.popular ? "md:-mt-4 md:mb-4" : ""}`}
    >
      {/* Popular badge */}
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-medium shadow-lg shadow-violet-500/25">
            <Sparkles className="w-4 h-4" />
            Most Popular
          </div>
        </div>
      )}

      <div className={`relative h-full bg-gradient-to-b from-white/[0.08] to-white/[0.02] rounded-2xl border ${plan.popular ? "border-violet-500/50" : "border-white/10"} p-8`}>
        {/* Glow for popular */}
        {plan.popular && (
          <div className="absolute -inset-px bg-gradient-to-r from-violet-500/30 via-purple-500/30 to-violet-500/30 rounded-2xl blur-xl -z-10" />
        )}

        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold text-white">{plan.price}</span>
            <span className="text-gray-400">/{plan.period}</span>
          </div>
          <p className="text-gray-400 mt-2 text-sm">{plan.description}</p>
        </div>

        <ul className="space-y-3 mb-8">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-center gap-3 text-gray-300">
              <div className={`p-0.5 rounded-full bg-gradient-to-r ${plan.color}`}>
                <Check className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        {isSignedIn ? (
          <Button
            asChild
            className={`w-full py-5 rounded-xl ${
              plan.popular
                ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/25"
                : "bg-white/10 hover:bg-white/20 text-white"
            }`}
          >
            <Link href="/create">{plan.cta}</Link>
          </Button>
        ) : (
          <SignInButton mode="modal">
            <Button
              className={`w-full py-5 rounded-xl ${
                plan.popular
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/25"
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
            >
              {plan.cta}
            </Button>
          </SignInButton>
        )}
      </div>
    </motion.div>
  );
}

export function Pricing() {
  return (
    <section className="py-24 px-4 relative">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-violet-600/10 via-transparent to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Simple, Transparent <span className="text-violet-400">Pricing</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Start free, upgrade when you need more. No hidden fees.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan, index) => (
            <PricingCard key={plan.name} plan={plan} index={index} />
          ))}
        </div>

        {/* FAQ teaser */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <p className="text-gray-400">
            Have questions?{" "}
            <a href="#" className="text-violet-400 hover:text-violet-300 transition-colors">
              Check our FAQ
            </a>
            {" "}or{" "}
            <a href="#" className="text-violet-400 hover:text-violet-300 transition-colors">
              contact us
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
