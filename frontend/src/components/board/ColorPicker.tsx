"use client";

import { useCanvasStore } from "@/store/canvasStore";
import { cn } from "@/lib/utils";

const STROKE_PRESETS = [
  "#6C63FF", "#3ECFCF", "#F0997B", "#FAC775",
  "#97C459", "#D4537E", "#F1F0E8", "rgba(128,128,128,0.35)",
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

const label = "mb-2 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground";

export function ColorPicker() {
  const { strokeColor, fillColor, strokeWidth, setStrokeColor, setFillColor, setStrokeWidth } =
    useCanvasStore();

  return (
    <div className="flex w-[200px] flex-col gap-4 rounded-xl border border-border bg-popover p-3.5 text-popover-foreground shadow-xl">
      <div>
        <span className={label}>Stroke</span>
        <div className="mb-2 grid grid-cols-4 gap-1.5">
          {STROKE_PRESETS.map((c) => (
            <button
              key={c}
              title={c}
              onClick={() => setStrokeColor(c)}
              className="relative flex h-6 w-6 items-center justify-center rounded-full border border-border transition-transform hover:scale-110"
              style={{
                background: c,
                outline: strokeColor === c ? "2px solid var(--foreground)" : "none",
                outlineOffset: 2,
              }}
            />
          ))}
        </div>
        <input
          type="color"
          value={strokeColor.startsWith("#") ? strokeColor : "#6C63FF"}
          onChange={(e) => setStrokeColor(e.target.value)}
          className="h-7 w-full cursor-pointer rounded-md border border-border bg-background"
        />
      </div>

      <div>
        <span className={label}>Fill</span>
        <div className="mb-2 grid grid-cols-4 gap-1.5">
          {FILL_PRESETS.map((c) => (
            <button
              key={c}
              title={c}
              onClick={() => setFillColor(c)}
              className="relative flex h-6 w-6 items-center justify-center rounded-full border border-border transition-transform hover:scale-110"
              style={{
                background: c === "transparent" ? "var(--muted)" : c,
                outline: fillColor === c ? "2px solid var(--foreground)" : "none",
                outlineOffset: 2,
              }}
            >
              {c === "transparent" && (
                <svg className="absolute inset-0" width="24" height="24" viewBox="0 0 24 24">
                  <line x1="4" y1="20" x2="20" y2="4" stroke="var(--destructive)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </button>
          ))}
        </div>
        <input
          type="color"
          value={fillColor === "transparent" ? "#ffffff" : fillColor}
          onChange={(e) => setFillColor(e.target.value)}
          className="h-7 w-full cursor-pointer rounded-md border border-border bg-background"
        />
      </div>

      <div>
        <span className={label}>Width</span>
        <div className="flex gap-1">
          {WIDTHS.map(({ label: lbl, value }) => (
            <button
              key={value}
              onClick={() => setStrokeWidth(value)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-md border py-1.5 text-[10px] transition-colors",
                strokeWidth === value
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"
              )}
            >
              <span
                className="block rounded-full"
                style={{
                  width: 16,
                  height: value,
                  background: strokeWidth === value ? "var(--brand)" : "var(--muted-foreground)",
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
