"use client";

import { useRef } from "react";
import {
  MousePointer2,
  Pencil,
  Square,
  Circle,
  ArrowRight,
  Type,
  StickyNote,
  Eraser,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/store/canvasStore";
import type { ToolType } from "@/types/canvas";

const TOOLS: { type: ToolType; icon: React.ReactNode; label: string }[] = [
  { type: "select", icon: <MousePointer2 size={16} />, label: "Select" },
  { type: "pen", icon: <Pencil size={16} />, label: "Pen" },
  { type: "rect", icon: <Square size={16} />, label: "Rectangle" },
  { type: "circle", icon: <Circle size={16} />, label: "Circle" },
  { type: "arrow", icon: <ArrowRight size={16} />, label: "Arrow" },
  { type: "text", icon: <Type size={16} />, label: "Text" },
  { type: "sticky", icon: <StickyNote size={16} />, label: "Sticky note" },
  { type: "eraser", icon: <Eraser size={16} />, label: "Eraser" },
];

const STROKE_WIDTHS = [1, 3, 6] as const;

export function Toolbar() {
  const { activeTool, strokeColor, strokeWidth, setTool, setStrokeColor, setStrokeWidth } =
    useCanvasStore();
  const colorInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="fixed left-0 flex flex-col items-center gap-1 py-2 z-20"
      style={{
        top: 56,
        width: 44,
        height: "calc(100vh - 56px)",
        background: "rgba(22,25,32,0.97)",
        borderRight: "0.5px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* tool buttons */}
      <div className="flex flex-col items-center gap-0.5 w-full px-1">
        {TOOLS.map(({ type, icon, label }) => (
          <button
            key={type}
            title={label}
            onClick={() => setTool(type)}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-md transition-colors",
              activeTool === type
                ? "bg-[#6C63FF] text-white"
                : "text-white/40 hover:bg-white/8 hover:text-white/80"
            )}
          >
            {icon}
          </button>
        ))}
      </div>

      {/* separator */}
      <div className="w-6 my-1" style={{ height: "0.5px", background: "rgba(255,255,255,0.1)" }} />

      {/* color picker */}
      <div className="relative flex items-center justify-center">
        <button
          title="Stroke color"
          className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-white/8 transition-colors"
          onClick={() => colorInputRef.current?.click()}
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
        <input
          ref={colorInputRef}
          type="color"
          value={strokeColor}
          onChange={(e) => setStrokeColor(e.target.value)}
          className="absolute opacity-0 w-0 h-0 pointer-events-none"
          tabIndex={-1}
        />
      </div>

      {/* stroke widths */}
      <div className="flex flex-col items-center gap-1.5 mt-1">
        {STROKE_WIDTHS.map((w) => (
          <button
            key={w}
            title={`Stroke ${w}px`}
            onClick={() => setStrokeWidth(w)}
            className="flex items-center justify-center w-8 h-6 rounded transition-colors hover:bg-white/8"
          >
            <span
              className="block rounded-full transition-colors"
              style={{
                width: w === 1 ? 12 : w === 3 ? 14 : 16,
                height: w === 1 ? 3 : w === 3 ? 5 : 7,
                background: strokeWidth === w ? "#6C63FF" : "rgba(255,255,255,0.35)",
                borderRadius: 99,
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
