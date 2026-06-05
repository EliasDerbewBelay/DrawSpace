"use client";

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { PenLine, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

const darkAppearance = {
  layout: {
    logoPlacement: "none" as const,
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "iconButton" as const,
  },
  variables: {
    colorPrimary: "#6C63FF",
    colorBackground: "#0F1117",
    colorInputBackground: "#161920",
    colorText: "#ffffff",
    colorTextSecondary: "rgba(255,255,255,0.5)",
    colorInputText: "#ffffff",
    colorNeutral: "rgba(255,255,255,0.15)",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "!w-full",
    cardBox: "!w-full !shadow-none !border-0 !bg-transparent !rounded-none",
    card: "!shadow-none !bg-transparent !border-0 !p-0 !w-full",
    headerTitle: "!text-white !text-xl !font-semibold",
    headerSubtitle: "!text-white/50 !text-sm",
    socialButtonsBlockButton:
      "!border-white/10 !bg-white/5 hover:!bg-white/10 !text-white/80",
    socialButtonsBlockButtonText: "!text-white/70",
    dividerLine: "!bg-white/10",
    dividerText: "!text-white/30",
    formFieldLabel: "!text-white/60 !text-xs",
    formFieldInput:
      "!bg-[#1a1d26] !border-white/10 !text-white placeholder:!text-white/20 focus:!border-violet-500",
    formButtonPrimary:
      "!bg-[#6C63FF] hover:!bg-violet-500 !text-white !font-medium !transition-colors",
    footerActionLink: "!text-violet-400 hover:!text-violet-300",
    footerActionText: "!text-white/40",
    identityPreviewText: "!text-white/80",
    identityPreviewEditButton: "!text-violet-400",
    formFieldAction: "!text-violet-400 hover:!text-violet-300",
    alternativeMethodsBlockButton:
      "!border-white/10 !bg-white/5 hover:!bg-white/10 !text-white/70",
    alertText: "!text-red-400",
    formResendCodeLink: "!text-violet-400",
  },
};

const lightAppearance = {
  layout: {
    logoPlacement: "none" as const,
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "iconButton" as const,
  },
  variables: {
    colorPrimary: "#6C63FF",
    colorBackground: "#ffffff",
    colorInputBackground: "#f5f5f7",
    colorText: "#111111",
    colorTextSecondary: "rgba(0,0,0,0.5)",
    colorInputText: "#111111",
    colorNeutral: "rgba(0,0,0,0.15)",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "!w-full",
    cardBox: "!w-full !shadow-none !border-0 !bg-transparent !rounded-none",
    card: "!shadow-none !bg-transparent !border-0 !p-0 !w-full",
    headerTitle: "!text-gray-900 !text-xl !font-semibold",
    headerSubtitle: "!text-gray-500 !text-sm",
    socialButtonsBlockButton:
      "!border-gray-200 !bg-gray-50 hover:!bg-gray-100 !text-gray-700",
    socialButtonsBlockButtonText: "!text-gray-700",
    dividerLine: "!bg-gray-200",
    dividerText: "!text-gray-400",
    formFieldLabel: "!text-gray-600 !text-xs",
    formFieldInput:
      "!bg-gray-50 !border-gray-200 !text-gray-900 placeholder:!text-gray-400 focus:!border-violet-500",
    formButtonPrimary:
      "!bg-[#6C63FF] hover:!bg-violet-500 !text-white !font-medium !transition-colors",
    footerActionLink: "!text-violet-600 hover:!text-violet-500",
    footerActionText: "!text-gray-500",
    identityPreviewText: "!text-gray-700",
    identityPreviewEditButton: "!text-violet-600",
    formFieldAction: "!text-violet-600 hover:!text-violet-500",
    alternativeMethodsBlockButton:
      "!border-gray-200 !bg-gray-50 hover:!bg-gray-100 !text-gray-700",
    alertText: "!text-red-500",
    formResendCodeLink: "!text-violet-600",
  },
};

export default function SignInPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      {/* Theme toggle — top right */}
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label="Toggle theme"
        className="fixed top-4 right-4 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        {isDark ? <Sun size={15} /> : <Moon size={15} />}
      </button>

      <div className="flex w-full max-w-sm flex-col items-center px-6 py-12">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mb-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white">
            <PenLine size={15} strokeWidth={2.5} />
          </div>
          <span className="text-base font-bold text-foreground">DrawSpace</span>
        </Link>

        <SignIn
          appearance={isDark ? darkAppearance : lightAppearance}
          redirectUrl="/dashboard"
          signUpUrl="/sign-up"
        />
      </div>
    </div>
  );
}
