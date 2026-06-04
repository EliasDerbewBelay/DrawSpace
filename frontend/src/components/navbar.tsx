"use client";

import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { Moon, Sun, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Templates", href: "#templates" },
  { label: "Pricing", href: "#pricing" },
];

export function Navbar() {
  const { theme, setTheme } = useTheme();

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 select-none">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white shadow-md shadow-violet-600/30">
            <PenLine size={14} strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-sm tracking-tight">DrawSpace</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <Sun size={15} className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon size={15} className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button variant="outline" size="sm" className="h-8 text-xs px-3">
                Log in
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm" className="h-8 text-xs px-3">
                Get started
              </Button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </div>
    </motion.header>
  );
}
