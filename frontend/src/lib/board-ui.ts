import { cn } from "@/lib/utils";

/** Shared Tailwind classes for board chrome (theme-aware) */
export const boardPanel = cn(
  "bg-card/90 backdrop-blur-md border-border text-foreground"
);

export const boardIconBtn = cn(
  "flex items-center justify-center rounded-lg transition-all active:scale-95",
  "text-muted-foreground hover:text-foreground hover:bg-muted",
  "border border-border"
);

export const boardMenuItem = cn(
  "flex items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 text-[13px] outline-none cursor-pointer transition-colors",
  "text-muted-foreground hover:bg-muted hover:text-foreground focus:bg-muted focus:text-foreground"
);

export const boardToolBtn = (active: boolean) =>
  cn(
    "flex h-8 w-8 items-center justify-center rounded-[7px] transition-all duration-100 active:scale-95",
    active
      ? "bg-primary text-primary-foreground shadow-[0_0_0_1px] shadow-primary/50"
      : "text-muted-foreground hover:bg-muted hover:text-foreground"
  );

export const boardBarBtn = cn(
  "flex items-center justify-center w-7 h-7 rounded-md transition-all duration-100",
  "text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95",
  "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:active:scale-100"
);
