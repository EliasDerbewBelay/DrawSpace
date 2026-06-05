"use client";

import { Minus, Plus, Undo2, Redo2, Download, Grid3X3, Maximize2 } from "lucide-react";
import type Konva from "konva";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/store/canvasStore";
import { getEmitters } from "@/hooks/useSync";

interface BottomBarProps {
  stageRef: React.RefObject<Konva.Stage | null>;
  boardName?: string;
}

const ZOOM_MIN  = 0.25;
const ZOOM_MAX  = 4;
const ZOOM_STEP = 0.25;

const btn = cn(
  "flex items-center justify-center w-7 h-7 rounded-md transition-all duration-100",
  "text-white/50 hover:text-white hover:bg-white/6 active:scale-95",
  "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:active:scale-100"
);

export function BottomBar({ stageRef, boardName = "board" }: BottomBarProps) {
  /* BUG-11: stageScale lifted to canvasStore so ContextMenu zoom stays in sync */
  const { history, historyIndex, showGrid, setShowGrid, stageScale, setStageScale } = useCanvasStore();

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  function applyZoom(z: number) {
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
    const stage = stageRef.current;
    if (stage) { stage.scale({ x: clamped, y: clamped }); stage.batchDraw(); }
    setStageScale(clamped);
  }

  function fitScreen() {
    const stage = stageRef.current;
    if (!stage) return;
    stage.position({ x: 0, y: 0 });
    stage.scale({ x: 1, y: 1 });
    stage.batchDraw();
    setStageScale(1);
  }

  function handleUndo() {
    const diff = useCanvasStore.getState().undo();
    if (!diff) return;
    const e = getEmitters();
    if (!e) return;
    diff.removed.forEach((el) => e.emitDelete(el.elementId));
    diff.updated.forEach((el) => e.emitUpdate(el));
    diff.added.forEach((el)   => e.emitDraw(el));
  }

  function handleRedo() {
    const diff = useCanvasStore.getState().redo();
    if (!diff) return;
    const e = getEmitters();
    if (!e) return;
    diff.added.forEach((el)   => e.emitDraw(el));
    diff.updated.forEach((el) => e.emitUpdate(el));
    diff.removed.forEach((el) => e.emitDelete(el.elementId));
  }

  function exportPng() {
    const stage = stageRef.current;
    if (!stage) return;
    const a = document.createElement("a");
    a.href = stage.toDataURL({ pixelRatio: 2 });
    a.download = `drawspace-${boardName}-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  }

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-40"
      style={{
        padding: "6px 14px",
        background: "rgba(22,25,32,0.88)",
        backdropFilter: "blur(10px)",
        border: "0.5px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
      }}
    >
      {/* Zoom group */}
      <div
        className="flex items-center rounded-lg"
        style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" }}
      >
        <button className={btn} onClick={() => applyZoom(stageScale - ZOOM_STEP)} disabled={stageScale <= ZOOM_MIN} title="Zoom out">
          <Minus size={13} />
        </button>
        <button
          className="min-w-[44px] text-center text-[12px] font-mono tabular-nums transition-colors hover:text-white/80"
          style={{ color: "rgba(255,255,255,0.50)" }}
          onClick={() => applyZoom(1)}
          title="Reset zoom (click)"
        >
          {Math.round(stageScale * 100)}%
        </button>
        <button className={btn} onClick={() => applyZoom(stageScale + ZOOM_STEP)} disabled={stageScale >= ZOOM_MAX} title="Zoom in">
          <Plus size={13} />
        </button>
      </div>

      <div className="h-5 w-px" style={{ background: "rgba(255,255,255,0.10)" }} />

      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <button className={btn} onClick={handleUndo} disabled={!canUndo} title="Undo (⌘Z)">
          <Undo2 size={14} />
        </button>
        <span className="text-[11px] px-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>Undo</span>
        <button className={btn} onClick={handleRedo} disabled={!canRedo} title="Redo (⌘⇧Z)">
          <Redo2 size={14} />
        </button>
        <span className="text-[11px] px-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>Redo</span>
      </div>

      <div className="h-5 w-px" style={{ background: "rgba(255,255,255,0.10)" }} />

      {/* Canvas tools */}
      <div className="flex items-center gap-0.5">
        <button
          className={cn(btn, showGrid && "text-[#6C63FF] hover:text-[#7C74FF]")}
          onClick={() => setShowGrid(!showGrid)}
          title={showGrid ? "Hide grid" : "Show grid"}
        >
          <Grid3X3 size={14} />
        </button>
        <button className={btn} onClick={fitScreen} title="Fit to screen">
          <Maximize2 size={14} />
        </button>
        <button
          className={cn(btn, "gap-1.5 px-2 w-auto text-[12px]")}
          onClick={exportPng}
          title="Export PNG (2×)"
        >
          <Download size={13} />
          Export
        </button>
      </div>
    </div>
  );
}
