"use client";

import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/store/canvasStore";

const COLOR_PRESETS = [
  "#6C63FF",
  "#3ECFCF",
  "#F0997B",
  "#FAC775",
  "#97C459",
  "#D4537E",
  "#ffffff",
  "rgba(255,255,255,0.1)",
];

const STROKE_SIZES = [
  { label: "S", value: 1 },
  { label: "M", value: 3 },
  { label: "L", value: 6 },
] as const;

export function RightPanel() {
  const {
    activeTool,
    selectedId,
    strokeColor,
    strokeWidth,
    setStrokeColor,
    setStrokeWidth,
    updateElement,
    deleteElement,
    elements,
  } = useCanvasStore();

  const visible = activeTool === "select" && selectedId !== null;
  if (!visible) return null;

  const selectedEl = elements.find((e) => e.elementId === selectedId);

  function applyColor(color: string) {
    setStrokeColor(color);
    if (selectedId) updateElement(selectedId, { stroke: color });
  }

  function applyStrokeWidth(w: number) {
    setStrokeWidth(w);
    if (selectedId) updateElement(selectedId, { strokeWidth: w });
  }

  function applyOpacity(opacity: number) {
    if (selectedId) updateElement(selectedId, { opacity });
  }

  return (
    <div
      className="fixed right-0 top-14 flex flex-col gap-4 px-3 py-4 z-20 overflow-y-auto"
      style={{
        width: 180,
        height: "calc(100vh - 56px)",
        background: "#161920",
        borderLeft: "0.5px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Color swatches */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-2">
          Color
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              title={c}
              onClick={() => applyColor(c)}
              className={cn(
                "w-8 h-8 rounded-md transition-transform hover:scale-110",
                strokeColor === c && "ring-2 ring-white/60"
              )}
              style={{ background: c, border: "1px solid rgba(255,255,255,0.12)" }}
            />
          ))}
        </div>
      </section>

      {/* Stroke width */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-2">
          Stroke
        </p>
        <div className="flex flex-col gap-1">
          {STROKE_SIZES.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => applyStrokeWidth(value)}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors",
                strokeWidth === value
                  ? "bg-[#6C63FF]/20 text-[#6C63FF]"
                  : "text-white/50 hover:bg-white/6 hover:text-white/80"
              )}
            >
              <span className="w-4 text-right font-mono">{label}</span>
              <span
                className="flex-1 rounded-full"
                style={{
                  height: value,
                  background: strokeWidth === value ? "#6C63FF" : "rgba(255,255,255,0.3)",
                }}
              />
            </button>
          ))}
        </div>
      </section>

      {/* Opacity */}
      <section>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-2">
          Opacity
        </p>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          defaultValue={selectedEl?.data.opacity ?? 1}
          onChange={(e) => applyOpacity(parseFloat(e.target.value))}
          className="w-full accent-[#6C63FF]"
        />
        <p className="text-[10px] text-white/30 mt-1 text-right">
          {Math.round((selectedEl?.data.opacity ?? 1) * 100)}%
        </p>
      </section>

      {/* Delete */}
      <section className="mt-auto">
        <button
          onClick={() => {
            if (selectedId) deleteElement(selectedId);
          }}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-xs text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 size={13} />
          Delete element
        </button>
      </section>
    </div>
  );
}
