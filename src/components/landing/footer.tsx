"use client";

import { motion } from "framer-motion";
import { Github, Twitter, Youtube, Mail, Sparkles } from "lucide-react";
import Link from "next/link";

const FOOTER_LINKS = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Templates", href: "/templates" },
    { label: "Changelog", href: "/changelog" },
  ],
  Resources: [
    { label: "Documentation", href: "/docs" },
    { label: "API Reference", href: "/api" },
    { label: "Blog", href: "/blog" },
    { label: "Community", href: "/community" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Contact", href: "/contact" },
    { label: "Press Kit", href: "/press" },
  ],
  Legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Cookies", href: "/cookies" },
  ],
};

const SOCIAL_LINKS = [
  { icon: Twitter, href: "https://twitter.com/remotionlabs", label: "Twitter" },
  { icon: Github, href: "https://github.com/remotionlabs", label: "GitHub" },
  { icon: Youtube, href: "https://youtube.com/@remotionlabs", label: "YouTube" },
];

export function Footer() {
  return (
    <footer className="relative border-t border-white/10">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">RemotionLabs</span>
            </Link>
            <p className="text-gray-400 text-sm mb-6 max-w-xs">
              AI-powered motion graphics from text prompts. Create stunning animations without code.
            </p>
            
            {/* Newsletter */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-white">Stay updated</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-sm"
                />
                <button className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors">
                  Subscribe
                </button>
              </div>
            </div>
          </div>

          {/* Links */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold text-white mb-4">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-16 pt-8 border-t border-white/10">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} RemotionLabs. All rights reserved.
          </p>
          
          {/* Social links */}
          <div className="flex items-center gap-4">
            {SOCIAL_LINKS.map((social) => {
              const Icon = social.icon;
              return (
                <motion.a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1 }}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <Icon className="w-5 h-5" />
                  <span className="sr-only">{social.label}</span>
                </motion.a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}
