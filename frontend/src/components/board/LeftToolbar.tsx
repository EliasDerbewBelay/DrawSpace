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
import { boardToolBtn } from "@/lib/board-ui";

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

export function LeftToolbar() {
  const { activeTool, strokeColor, strokeWidth, setTool, setStrokeWidth } = useCanvasStore();

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
      className="fixed left-0 z-30 flex flex-col items-center gap-0.5 border-r border-border bg-card/90 py-2.5 backdrop-blur-md"
      style={{ top: 56, width: 44, height: "calc(100vh - 56px)" }}
    >
      {TOOLS.map(({ type, icon, label, key }) => (
        <button
          key={type}
          title={`${label} (${key})`}
          onClick={() => setTool(type)}
          className={boardToolBtn(activeTool === type)}
        >
          {icon}
        </button>
      ))}

      <div className="mx-auto my-2 h-px w-6 bg-border" />

      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            title="Colors"
            className="flex h-8 w-8 items-center justify-center rounded-[7px] transition-all duration-100 hover:bg-muted active:scale-95"
          >
            <span
              className="block rounded-full border-2 border-border"
              style={{ width: 18, height: 18, background: strokeColor }}
            />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content side="right" sideOffset={8} align="center" className="z-50">
            <ColorPicker />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <div className="mt-1 flex flex-col items-center gap-2">
        {STROKE_WIDTHS.map(({ value, size }) => (
          <button
            key={value}
            title={`Stroke ${value}px`}
            onClick={() => setStrokeWidth(value)}
            className={cn(
              "flex h-7 w-8 items-center justify-center rounded transition-all active:scale-90",
              strokeWidth === value && "bg-primary/15"
            )}
          >
            <span
              className="block rounded-full"
              style={{
                width: size,
                height: size,
                background: strokeWidth === value ? "var(--brand)" : strokeColor,
                opacity: strokeWidth === value ? 1 : 0.4,
                outline: strokeWidth === value ? "2px solid var(--foreground)" : "none",
                outlineOffset: 1,
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
