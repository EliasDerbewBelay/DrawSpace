"use client";

import { Minus, Plus, Undo2, Redo2, Download, Grid3X3, Maximize2 } from "lucide-react";
import type Konva from "konva";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/store/canvasStore";
import { getEmitters } from "@/hooks/useSync";
import { boardBarBtn } from "@/lib/board-ui";

interface BottomBarProps {
  stageRef: React.RefObject<Konva.Stage | null>;
  boardName?: string;
}

const ZOOM_MIN  = 0.25;
const ZOOM_MAX  = 4;
const ZOOM_STEP = 0.25;

export function BottomBar({ stageRef, boardName = "board" }: BottomBarProps) {
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
    <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-border bg-card/90 px-3.5 py-1.5 shadow-lg backdrop-blur-md">
      <div className="flex items-center rounded-lg border border-border bg-muted/50">
        <button className={boardBarBtn} onClick={() => applyZoom(stageScale - ZOOM_STEP)} disabled={stageScale <= ZOOM_MIN} title="Zoom out">
          <Minus size={13} />
        </button>
        <button
          className="min-w-[44px] text-center font-mono text-[12px] tabular-nums text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => applyZoom(1)}
          title="Reset zoom (click)"
        >
          {Math.round(stageScale * 100)}%
        </button>
        <button className={boardBarBtn} onClick={() => applyZoom(stageScale + ZOOM_STEP)} disabled={stageScale >= ZOOM_MAX} title="Zoom in">
          <Plus size={13} />
        </button>
      </div>

      <div className="h-5 w-px bg-border" />

      <div className="flex items-center gap-0.5">
        <button className={boardBarBtn} onClick={handleUndo} disabled={!canUndo} title="Undo (⌘Z)">
          <Undo2 size={14} />
        </button>
        <span className="px-0.5 text-[11px] text-muted-foreground/60">Undo</span>
        <button className={boardBarBtn} onClick={handleRedo} disabled={!canRedo} title="Redo (⌘⇧Z)">
          <Redo2 size={14} />
        </button>
        <span className="px-0.5 text-[11px] text-muted-foreground/60">Redo</span>
      </div>

      <div className="h-5 w-px bg-border" />

      <div className="flex items-center gap-0.5">
        <button
          className={cn(boardBarBtn, showGrid && "text-primary hover:text-primary")}
          onClick={() => setShowGrid(!showGrid)}
          title={showGrid ? "Hide grid" : "Show grid"}
        >
          <Grid3X3 size={14} />
        </button>
        <button className={boardBarBtn} onClick={fitScreen} title="Fit to screen">
          <Maximize2 size={14} />
        </button>
        <button
          className={cn(boardBarBtn, "h-7 w-auto gap-1.5 px-2 text-[12px]")}
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
