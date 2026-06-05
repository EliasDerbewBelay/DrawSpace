"use client";

import { useCanvasStore } from "@/store/canvasStore";
import { cn } from "@/lib/utils";

const STROKE_PRESETS = [
  "#6C63FF", "#3ECFCF", "#F0997B", "#FAC775",
  "#97C459", "#D4537E", "#F1F0E8", "rgba(255,255,255,0.2)",
];

const FILL_PRESETS = [
  "transparent", "#6C63FF", "#3ECFCF", "#F0997B",
  "#FAC775", "#97C459", "#D4537E", "#F1F0E8",
];

const WIDTHS = [
  { label: "S", value: 2 },
  { label: "M", value: 4 },
  { label: "L", value: 8 },
] as const;

const label = "text-[10px] font-semibold uppercase tracking-widest mb-2 block";

export function ColorPicker() {
  const { strokeColor, fillColor, strokeWidth, setStrokeColor, setFillColor, setStrokeWidth } =
    useCanvasStore();

  return (
    <div
      className="flex flex-col gap-4"
      style={{
        width: 200,
        background: "#1E2028",
        border: "0.5px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: 14,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      {/* Stroke */}
      <div>
        <span className={label} style={{ color: "rgba(255,255,255,0.35)" }}>Stroke</span>
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          {STROKE_PRESETS.map((c) => (
            <button
              key={c}
              title={c}
              onClick={() => setStrokeColor(c)}
              className="relative flex h-6 w-6 items-center justify-center rounded-full transition-transform hover:scale-110"
              style={{
                background: c === "rgba(255,255,255,0.2)" ? "rgba(255,255,255,0.2)" : c,
                border: "1px solid rgba(255,255,255,0.15)",
                outline: strokeColor === c ? "2px solid white" : "none",
                outlineOffset: 2,
              }}
            />
          ))}
        </div>
        <input
          type="color"
          value={strokeColor.startsWith("rgba") ? "#ffffff" : strokeColor}
          onChange={(e) => setStrokeColor(e.target.value)}
          className="h-7 w-full cursor-pointer rounded-md border-0"
          style={{ background: "none" }}
          title="Custom stroke color"
        />
      </div>

      <div className="h-px w-full" style={{ background: "rgba(255,255,255,0.07)" }} />

      {/* Fill */}
      <div>
        <span className={label} style={{ color: "rgba(255,255,255,0.35)" }}>Fill</span>
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          {FILL_PRESETS.map((c) => (
            <button
              key={c}
              title={c === "transparent" ? "None" : c}
              onClick={() => setFillColor(c)}
              className="relative flex h-6 w-6 items-center justify-center rounded-full transition-transform hover:scale-110"
              style={{
                background: c === "transparent" ? "rgba(255,255,255,0.08)" : c,
                border: "1px solid rgba(255,255,255,0.15)",
                outline: fillColor === c ? "2px solid white" : "none",
                outlineOffset: 2,
              }}
            >
              {c === "transparent" && (
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <line x1="2" y1="14" x2="14" y2="2" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </button>
          ))}
        </div>
        <input
          type="color"
          value={fillColor === "transparent" || fillColor.startsWith("rgba") ? "#ffffff" : fillColor}
          onChange={(e) => setFillColor(e.target.value)}
          className="h-7 w-full cursor-pointer rounded-md border-0"
          style={{ background: "none" }}
          title="Custom fill color"
        />
      </div>

      <div className="h-px w-full" style={{ background: "rgba(255,255,255,0.07)" }} />

      {/* Stroke width */}
      <div>
        <span className={label} style={{ color: "rgba(255,255,255,0.35)" }}>Width</span>
        <div className="flex gap-1.5">
          {WIDTHS.map(({ label: lbl, value }) => (
            <button
              key={value}
              onClick={() => setStrokeWidth(value)}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-[10px] font-medium transition-colors",
                strokeWidth === value
                  ? "text-[#6C63FF]"
                  : "text-white/40 hover:text-white/70"
              )}
              style={{
                background: strokeWidth === value ? "rgba(108,99,255,0.15)" : "rgba(255,255,255,0.04)",
                border: strokeWidth === value ? "0.5px solid #6C63FF" : "0.5px solid rgba(255,255,255,0.1)",
              }}
            >
              <span
                className="block rounded-full"
                style={{
                  width: 20,
                  height: value,
                  background: strokeWidth === value ? "#6C63FF" : "rgba(255,255,255,0.3)",
                }}
              />
              {lbl}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
