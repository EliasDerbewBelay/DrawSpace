"use client";

import { useState } from "react";
import { Minus, Plus, Undo2, Redo2, Download } from "lucide-react";
import type Konva from "konva";
import { useCanvasStore } from "@/store/canvasStore";
import { getEmitters } from "@/hooks/useSync";

interface BottomBarProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

const ZOOM_STEP = 25;
const ZOOM_MIN  = 25;
const ZOOM_MAX  = 200;

export function BottomBar({ stageRef }: BottomBarProps) {
  const [zoom, setZoom] = useState(100);
  const { history, historyIndex } = useCanvasStore();

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  /* ── zoom ─────────────────────────────────────────────── */

  function applyZoom(value: number) {
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
    const stage = stageRef.current;
    if (stage) {
      const scale = clamped / 100;
      stage.scale({ x: scale, y: scale });
      stage.batchDraw();
    }
    setZoom(clamped);
  }

  /* ── export ───────────────────────────────────────────── */

  function handleExport() {
    const stage = stageRef.current;
    if (!stage) return;
    const dataUrl = stage.toDataURL({ pixelRatio: 2 });
    const anchor  = document.createElement("a");
    anchor.href     = dataUrl;
    anchor.download = "drawspace-board.png";
    anchor.click();
  }

  /* ── undo / redo with server sync ────────────────────── */

  function handleUndo() {
    const diff = useCanvasStore.getState().undo();
    if (!diff) return;
    const emitters = getEmitters();
    if (!emitters) return;
    diff.removed.forEach((el) => emitters.emitDelete(el.elementId));
    diff.updated.forEach((el) => emitters.emitUpdate(el));
    diff.added.forEach((el)   => emitters.emitDraw(el));
  }

  function handleRedo() {
    const diff = useCanvasStore.getState().redo();
    if (!diff) return;
    const emitters = getEmitters();
    if (!emitters) return;
    diff.added.forEach((el)   => emitters.emitDraw(el));
    diff.updated.forEach((el) => emitters.emitUpdate(el));
    diff.removed.forEach((el) => emitters.emitDelete(el.elementId));
  }

  /* ── styles ───────────────────────────────────────────── */

  const btn =
    "flex items-center justify-center w-7 h-7 rounded-md transition-colors text-white/50 hover:text-white hover:bg-white/8 disabled:opacity-30 disabled:cursor-not-allowed";

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-1.5 z-30"
      style={{
        background:     "rgba(22,25,32,0.92)",
        backdropFilter: "blur(8px)",
        border:         "0.5px solid rgba(255,255,255,0.1)",
        borderRadius:   10,
      }}
    >
      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <button
          className={btn}
          onClick={() => applyZoom(zoom - ZOOM_STEP)}
          disabled={zoom <= ZOOM_MIN}
          title="Zoom out"
        >
          <Minus size={13} />
        </button>
        <span className="text-xs text-white/60 w-12 text-center font-mono tabular-nums">
          {zoom}%
        </span>
        <button
          className={btn}
          onClick={() => applyZoom(zoom + ZOOM_STEP)}
          disabled={zoom >= ZOOM_MAX}
          title="Zoom in"
        >
          <Plus size={13} />
        </button>
      </div>

      <div className="w-px h-4 bg-white/10" />

      {/* Undo / redo */}
      <div className="flex items-center gap-1">
        <button
          className={btn}
          onClick={handleUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z / ⌘Z)"
        >
          <Undo2 size={14} />
        </button>
        <button
          className={btn}
          onClick={handleRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z / ⌘⇧Z)"
        >
          <Redo2 size={14} />
        </button>
      </div>

      <div className="w-px h-4 bg-white/10" />

      {/* Export */}
      <button
        className={`${btn} gap-1.5 px-2 w-auto text-xs`}
        onClick={handleExport}
        title="Export PNG (2×)"
      >
        <Download size={13} />
        Export
      </button>
    </div>
  );
}
