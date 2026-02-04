"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { UserMenu } from "@/components/auth/user-menu";
import Link from "next/link";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#demo" },
  { label: "Gallery", href: "#gallery" },
  { label: "Pricing", href: "#pricing" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-black/80 backdrop-blur-xl border-b border-white/10"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">RemotionLabs</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Auth */}
            <div className="hidden md:flex items-center gap-4">
              <SignedOut>
                <SignInButton mode="modal">
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                    Sign In
                  </Button>
                </SignInButton>
                <SignInButton mode="modal">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white"
                  >
                    Get Started
                  </Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Button
                  asChild
                  size="sm"
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white"
                >
                  <Link href="/create">Create</Link>
                </Button>
                <UserMenu />
              </SignedIn>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl pt-20 px-4 md:hidden"
          >
            <div className="flex flex-col items-center gap-6 py-8">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-lg text-gray-300 hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button variant="outline" className="w-full">
                      Sign In
                    </Button>
                  </SignInButton>
                  <SignInButton mode="modal">
                    <Button className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white">
                      Get Started
                    </Button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <Button asChild className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white">
                    <Link href="/create">Create Animation</Link>
                  </Button>
                </SignedIn>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
