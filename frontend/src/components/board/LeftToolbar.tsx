"use client";

import { useEffect } from "react";
import {
  MousePointer2, Pen, Square, Circle, ArrowUpRight,
  Type, StickyNote, Eraser,
} from "lucide-react";
import { Popover } from "radix-ui";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/store/canvasStore";
import type { ToolType } from "@/types/canvas";
import { ColorPicker } from "./ColorPicker";

/* ─── tool definitions ───────────────────────────────────────── */

const TOOLS: { type: ToolType; icon: React.ReactNode; label: string; key: string }[] = [
  { type: "select", icon: <MousePointer2 size={15} />, label: "Select",     key: "V" },
  { type: "pen",    icon: <Pen size={15} />,           label: "Pen",        key: "P" },
  { type: "rect",   icon: <Square size={15} />,        label: "Rectangle",  key: "R" },
  { type: "circle", icon: <Circle size={15} />,        label: "Circle",     key: "C" },
  { type: "arrow",  icon: <ArrowUpRight size={15} />,  label: "Arrow",      key: "A" },
  { type: "text",   icon: <Type size={15} />,          label: "Text",       key: "T" },
  { type: "sticky", icon: <StickyNote size={15} />,    label: "Sticky",     key: "S" },
  { type: "eraser", icon: <Eraser size={15} />,        label: "Eraser",     key: "E" },
];

const STROKE_WIDTHS = [
  { value: 2, size: 8  },
  { value: 4, size: 11 },
  { value: 8, size: 15 },
] as const;

/* ─── component ──────────────────────────────────────────────── */

export function LeftToolbar() {
  const { activeTool, strokeColor, strokeWidth, setTool, setStrokeWidth } = useCanvasStore();

  /* keyboard shortcuts */
  useEffect(() => {
    const map: Record<string, ToolType> = {
      v: "select", p: "pen", r: "rect", c: "circle",
      a: "arrow",  t: "text", s: "sticky", e: "eraser",
    };
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tool = map[e.key.toLowerCase()];
      if (tool) setTool(tool);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setTool]);

  return (
    <div
      className="fixed left-0 flex flex-col items-center py-2.5 gap-0.5 z-30"
      style={{
        top: 56,
        width: 44,
        height: "calc(100vh - 56px)",
        background: "rgba(22,25,32,0.92)",
        borderRight: "0.5px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* tool buttons */}
      {TOOLS.map(({ type, icon, label, key }) => (
        <button
          key={type}
          title={`${label} (${key})`}
          onClick={() => setTool(type)}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-[7px] transition-all duration-100 active:scale-95",
            activeTool === type
              ? "bg-[#6C63FF] text-white shadow-[0_0_0_1px_rgba(108,99,255,0.5)]"
              : "text-white/35 hover:bg-white/6 hover:text-white/70"
          )}
        >
          {icon}
        </button>
      ))}

      {/* separator */}
      <div className="my-2 mx-auto w-6 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />

      {/* color dot → Popover */}
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            title="Colors"
            className="flex h-8 w-8 items-center justify-center rounded-[7px] hover:bg-white/6 transition-all duration-100 active:scale-95"
          >
            <span
              className="block rounded-full"
              style={{
                width: 18,
                height: 18,
                background: strokeColor,
                border: "2px solid rgba(255,255,255,0.25)",
              }}
            />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content side="right" sideOffset={8} align="center" className="z-50">
            <ColorPicker />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {/* stroke width dots */}
      <div className="flex flex-col items-center gap-2 mt-1">
        {STROKE_WIDTHS.map(({ value, size }) => (
          <button
            key={value}
            title={`Stroke ${value}px`}
            onClick={() => setStrokeWidth(value)}
            className="flex h-7 w-8 items-center justify-center rounded transition-all active:scale-90"
            style={{ background: strokeWidth === value ? "rgba(108,99,255,0.15)" : "transparent" }}
          >
            <span
              className="block rounded-full"
              style={{
                width: size,
                height: size,
                background: strokeWidth === value ? "#6C63FF" : strokeColor,
                opacity: strokeWidth === value ? 1 : 0.4,
                outline: strokeWidth === value ? "2px solid white" : "none",
                outlineOffset: 1,
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
