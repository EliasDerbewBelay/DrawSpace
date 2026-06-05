"use client";

import { AlignLeft, AlignCenter, AlignRight, ArrowUpToLine, ArrowDownToLine, ArrowUp, ArrowDown, Trash2, Copy, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/store/canvasStore";
import { getEmitters } from "@/hooks/useSync";
import type { KonvaData } from "@/types/canvas";

const STROKE_COLORS = ["#6C63FF", "#3ECFCF", "#F0997B", "#FAC775", "#97C459", "#D4537E", "#F1F0E8", "rgba(255,255,255,0.2)"];
const STROKE_SIZES  = [{ label: "S", value: 2 }, { label: "M", value: 4 }, { label: "L", value: 8 }] as const;

const sectionLabel = "text-[10px] font-semibold uppercase tracking-widest mb-2 block";
const numInput = "w-[66px] rounded-md bg-[#0F1117] px-2 py-1 text-[12px] text-[#E8E6DE] outline-none transition-colors focus:outline focus:outline-[1.5px] focus:outline-[#6C63FF]";
const ghostBtn  = "flex h-7 w-7 items-center justify-center rounded-md text-white/40 hover:bg-white/6 hover:text-white/80 transition-colors active:scale-95";

export function RightPanel() {
  const {
    activeTool, selectedIds, elements,
    strokeColor, strokeWidth, fillColor,
    setStrokeColor, setStrokeWidth, setFillColor,
    updateElement, deleteElements, addElement,
  } = useCanvasStore();

  const visible = activeTool === "select" && selectedIds.length > 0;
  if (!visible) return null;

  const elRaw = elements.find((e) => e.elementId === selectedIds[0]);
  if (!elRaw) return null;
  const el = elRaw;

  const d = el.data;
  const isText   = el.type === "text" || el.type === "sticky";
  const hasFill  = el.type !== "pen" && el.type !== "arrow";

  function up(patch: Partial<KonvaData>) {
    selectedIds.forEach((id) => updateElement(id, patch));
    const emitters = getEmitters();
    if (emitters) {
      selectedIds.forEach((id) => {
        const target = elements.find((e) => e.elementId === id);
        if (target) emitters.emitUpdate({ ...target, data: { ...target.data, ...patch }, updatedAt: Date.now() });
      });
    }
  }

  /* layer ordering (operates on the first selected element) */
  function reorder(direction: "front" | "back" | "up" | "down") {
    const store = useCanvasStore.getState();
    const idx = store.elements.findIndex((e) => e.elementId === el.elementId);
    if (idx < 0) return;
    const arr = [...store.elements];
    if      (direction === "front") { arr.push(arr.splice(idx, 1)[0]); }
    else if (direction === "back")  { arr.unshift(arr.splice(idx, 1)[0]); }
    else if (direction === "up" && idx < arr.length - 1) { [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]; }
    else if (direction === "down" && idx > 0)            { [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]]; }
    store.setElements(arr);

    const moved = arr.find((e) => e.elementId === el.elementId);
    if (moved) {
      getEmitters()?.emitUpdate({ ...moved, updatedAt: Date.now() });
    }
  }

  function duplicate() {
    const clone: typeof el = {
      elementId: crypto.randomUUID(),
      type:      el.type,
      createdBy: el.createdBy,
      updatedAt: Date.now(),
      data: { ...el.data, x: (el.data.x ?? 0) + 16, y: (el.data.y ?? 0) + 16 },
    };
    addElement(clone);
    getEmitters()?.emitDraw(clone);
  }

  return (
    <div
      className="fixed right-0 flex flex-col gap-0 overflow-y-auto z-30"
      style={{
        top: 56,
        width: 180,
        height: "calc(100vh - 56px)",
        background: "#161920",
        borderLeft: "0.5px solid rgba(255,255,255,0.07)",
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(255,255,255,0.1) transparent",
      }}
    >
      <div className="flex flex-col gap-4 px-3 py-4">

        {/* Transform */}
        <section>
          <span className={sectionLabel} style={{ color: "rgba(255,255,255,0.30)" }}>Transform</span>
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-1.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-white/25 px-0.5">X</span>
                <input
                  type="number"
                  className={numInput}
                  value={Math.round(d.x ?? 0)}
                  onChange={(e) => up({ x: parseFloat(e.target.value) || 0 })}
                  style={{ border: "0.5px solid rgba(255,255,255,0.10)" }}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-white/25 px-0.5">Y</span>
                <input
                  type="number"
                  className={numInput}
                  value={Math.round(d.y ?? 0)}
                  onChange={(e) => up({ y: parseFloat(e.target.value) || 0 })}
                  style={{ border: "0.5px solid rgba(255,255,255,0.10)" }}
                />
              </div>
            </div>
            {d.width !== undefined && (
              <div className="flex gap-1.5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-white/25 px-0.5">W</span>
                  <input
                    type="number"
                    className={numInput}
                    value={Math.round(d.width ?? 0)}
                    onChange={(e) => up({ width: parseFloat(e.target.value) || 0 })}
                    style={{ border: "0.5px solid rgba(255,255,255,0.10)" }}
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-white/25 px-0.5">H</span>
                  <input
                    type="number"
                    className={numInput}
                    value={Math.round(d.height ?? 0)}
                    onChange={(e) => up({ height: parseFloat(e.target.value) || 0 })}
                    style={{ border: "0.5px solid rgba(255,255,255,0.10)" }}
                  />
                </div>
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-0.5">
              <RotateCw size={12} className="text-white/30 shrink-0" />
              <input
                type="number"
                className={cn(numInput, "flex-1")}
                style={{ width: "100%", border: "0.5px solid rgba(255,255,255,0.10)" }}
                value={Math.round(d.rotation ?? 0)}
                onChange={(e) => up({ rotation: parseFloat(e.target.value) || 0 })}
              />
              <span className="text-[11px] text-white/25">°</span>
            </div>
          </div>
        </section>

        <div className="h-px w-full" style={{ background: "rgba(255,255,255,0.07)" }} />

        {/* Style */}
        {!isText && (
          <section>
            <span className={sectionLabel} style={{ color: "rgba(255,255,255,0.30)" }}>Style</span>
            <div className="flex flex-col gap-2">
              <div>
                <span className="text-[10px] text-white/30 mb-1.5 block">Stroke</span>
                <div className="grid grid-cols-4 gap-1">
                  {STROKE_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setStrokeColor(c); up({ stroke: c }); }}
                      className="h-6 w-6 rounded-full transition-transform hover:scale-110"
                      style={{
                        background: c,
                        border: "1px solid rgba(255,255,255,0.12)",
                        outline: strokeColor === c ? "2px solid white" : "none",
                        outlineOffset: 2,
                      }}
                    />
                  ))}
                </div>
              </div>
              {hasFill && (
                <div>
                  <span className="text-[10px] text-white/30 mb-1.5 block">Fill</span>
                  <div className="grid grid-cols-4 gap-1">
                    {["transparent", "#6C63FF", "#3ECFCF", "#F0997B", "#FAC775", "#97C459", "#D4537E", "#F1F0E8"].map((c) => (
                      <button
                        key={c}
                        onClick={() => { setFillColor(c); up({ fill: c }); }}
                        className="relative h-6 w-6 rounded-full transition-transform hover:scale-110"
                        style={{
                          background: c === "transparent" ? "rgba(255,255,255,0.06)" : c,
                          border: "1px solid rgba(255,255,255,0.12)",
                          outline: fillColor === c ? "2px solid white" : "none",
                          outlineOffset: 2,
                        }}
                      >
                        {c === "transparent" && (
                          <svg className="absolute inset-0" width="24" height="24" viewBox="0 0 24 24">
                            <line x1="4" y1="20" x2="20" y2="4" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-1">
                {STROKE_SIZES.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => { setStrokeWidth(value); up({ strokeWidth: value }); }}
                    className={cn("flex flex-1 flex-col items-center gap-1 rounded-md py-1.5 text-[10px] transition-colors",
                      strokeWidth === value ? "text-[#6C63FF]" : "text-white/35 hover:text-white/60"
                    )}
                    style={{
                      background: strokeWidth === value ? "rgba(108,99,255,0.15)" : "rgba(255,255,255,0.04)",
                      border: strokeWidth === value ? "0.5px solid #6C63FF" : "0.5px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <span className="block rounded-full" style={{ width: 16, height: value, background: strokeWidth === value ? "#6C63FF" : "rgba(255,255,255,0.3)" }} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Text settings */}
        {isText && (
          <section>
            <span className={sectionLabel} style={{ color: "rgba(255,255,255,0.30)" }}>Text</span>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-white/30 w-12 shrink-0">Size</span>
                <input
                  type="number"
                  min={10} max={72}
                  className={cn(numInput, "flex-1")}
                  style={{ width: "100%", border: "0.5px solid rgba(255,255,255,0.10)" }}
                  value={d.fontSize ?? 16}
                  onChange={(e) => up({ fontSize: parseInt(e.target.value) || 16 })}
                />
              </div>
              <div className="flex gap-1">
                {[
                  { icon: <AlignLeft size={13} />, align: "left" },
                  { icon: <AlignCenter size={13} />, align: "center" },
                  { icon: <AlignRight size={13} />, align: "right" },
                ].map(({ icon }) => (
                  <button key={Math.random()} className={ghostBtn}>{icon}</button>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="h-px w-full" style={{ background: "rgba(255,255,255,0.07)" }} />

        {/* Opacity */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <span className={sectionLabel} style={{ color: "rgba(255,255,255,0.30)", margin: 0 }}>Opacity</span>
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.40)" }}>
              {Math.round((d.opacity ?? 1) * 100)}%
            </span>
          </div>
          <input
            type="range" min={0} max={1} step={0.05}
            className="w-full accent-[#6C63FF]"
            style={{ height: 4 }}
            value={d.opacity ?? 1}
            onChange={(e) => up({ opacity: parseFloat(e.target.value) })}
          />
        </section>

        <div className="h-px w-full" style={{ background: "rgba(255,255,255,0.07)" }} />

        {/* Layer order */}
        <section>
          <span className={sectionLabel} style={{ color: "rgba(255,255,255,0.30)" }}>Layer</span>
          <div className="flex gap-1">
            <button className={ghostBtn} title="Bring to front"  onClick={() => reorder("front")}><ArrowUpToLine size={13} /></button>
            <button className={ghostBtn} title="Move up"         onClick={() => reorder("up")}><ArrowUp size={13} /></button>
            <button className={ghostBtn} title="Move down"       onClick={() => reorder("down")}><ArrowDown size={13} /></button>
            <button className={ghostBtn} title="Send to back"    onClick={() => reorder("back")}><ArrowDownToLine size={13} /></button>
          </div>
        </section>

        <div className="h-px w-full" style={{ background: "rgba(255,255,255,0.07)" }} />

        {/* Actions */}
        <section className="flex flex-col gap-1">
          <button
            onClick={duplicate}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-white/60 hover:bg-white/6 hover:text-white transition-colors"
          >
            <Copy size={13} /> Duplicate
          </button>
          <button
            onClick={() => { deleteElements(selectedIds); selectedIds.forEach((id) => getEmitters()?.emitDelete(id)); }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] transition-colors hover:bg-red-500/10"
            style={{ color: "#F87171" }}
          >
            <Trash2 size={13} />
            {selectedIds.length > 1 ? `Delete ${selectedIds.length} elements` : "Delete element"}
          </button>
        </section>

      </div>
    </div>
  );
}
