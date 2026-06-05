"use client";

import { useEffect, useRef } from "react";
import {
  MousePointer2, Copy, ArrowUpToLine, ArrowDownToLine,
  Trash2, Clipboard, BoxSelect, ZoomIn, ZoomOut, Maximize2, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { boardMenuItem } from "@/lib/board-ui";
import { useCanvasStore } from "@/store/canvasStore";
import { getEmitters } from "@/hooks/useSync";
import type { CanvasElement } from "@/types/canvas";
import type Konva from "konva";

interface ContextMenuProps {
  position:   { x: number; y: number } | null;
  elementId:  string | null;
  onClose:    () => void;
  stageRef:   React.RefObject<Konva.Stage | null>;
}

const item = boardMenuItem;
const iconCls = "shrink-0 text-muted-foreground";

export function ContextMenu({ position, elementId, onClose, stageRef }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { elements, selectedIds, setSelectedIds, deleteElements, addElement } = useCanvasStore();

  /* close on unmount only — use a ref so changing onClose identity
     does not re-fire cleanup and cause a render loop */
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => () => onCloseRef.current(), []);

  /* close on outside click + escape */
  useEffect(() => {
    if (!position) return;
    function onMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [position, onClose]);

  if (!position) return null;

  /* adjust position so menu stays inside viewport */
  const menuW = 192, menuH = elementId ? 260 : 200;
  const left = Math.min(position.x, window.innerWidth  - menuW - 8);
  const top  = Math.min(position.y, window.innerHeight - menuH - 8);

  function run(fn: () => void) { fn(); onClose(); }

  function select() {
    if (elementId) setSelectedIds([elementId]);
  }

  function duplicate() {
    if (!elementId) return;
    const source = elements.find((e) => e.elementId === elementId);
    if (!source) return;
    const clone: CanvasElement = {
      ...source,
      elementId: crypto.randomUUID(),
      data: { ...source.data, x: (source.data.x ?? 0) + 16, y: (source.data.y ?? 0) + 16 },
      updatedAt: Date.now(),
    };
    addElement(clone);
    getEmitters()?.emitDraw(clone);
  }

  function reorder(dir: "front" | "back") {
    if (!elementId) return;
    const store = useCanvasStore.getState();
    const idx = store.elements.findIndex((e) => e.elementId === elementId);
    if (idx < 0) return;
    const arr = [...store.elements];
    if (dir === "front") arr.push(arr.splice(idx, 1)[0]);
    else                  arr.unshift(arr.splice(idx, 1)[0]);
    store.setElements(arr);

    const moved = arr.find((e) => e.elementId === elementId);
    if (moved) {
      getEmitters()?.emitUpdate({ ...moved, updatedAt: Date.now() });
    }
  }

  function deleteEl() {
    if (!elementId) return;
    deleteElements([elementId]);
    getEmitters()?.emitDelete(elementId);
  }

  function selectAll() {
    setSelectedIds(elements.map((e) => e.elementId));
  }

  function zoom(delta: number) {
    const stage = stageRef.current;
    if (!stage) return;
    const cur = stage.scaleX();
    const next = Math.min(4, Math.max(0.25, cur + delta));
    stage.scale({ x: next, y: next });
    stage.batchDraw();
    /* BUG-11: keep BottomBar display in sync */
    useCanvasStore.getState().setStageScale(next);
  }

  function resetView() {
    const stage = stageRef.current;
    if (!stage) return;
    stage.position({ x: 0, y: 0 });
    stage.scale({ x: 1, y: 1 });
    stage.batchDraw();
    /* BUG-11: keep BottomBar display in sync */
    useCanvasStore.getState().setStageScale(1);
  }

  function exportPng() {
    const stage = stageRef.current;
    if (!stage) return;
    const a = document.createElement("a");
    a.href = stage.toDataURL({ pixelRatio: 2 });
    a.download = `drawspace-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  }

  const sep = <div className="my-1 h-px bg-border" />;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] rounded-[10px] border border-border bg-popover p-1 text-popover-foreground shadow-xl"
      style={{
        left,
        top,
        animation: "ctxFadeIn 0.1s ease forwards",
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <style>{`
        @keyframes ctxFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {elementId ? (
        <>
          <button className={item} onClick={() => run(select)}>
            <MousePointer2 size={14} className={iconCls} /> Select
          </button>
          <button className={item} onClick={() => run(duplicate)}>
            <Copy size={14} className={iconCls} /> Duplicate
          </button>
          <button className={item} onClick={() => run(() => reorder("front"))}>
            <ArrowUpToLine size={14} className={iconCls} /> Bring to front
          </button>
          <button className={item} onClick={() => run(() => reorder("back"))}>
            <ArrowDownToLine size={14} className={iconCls} /> Send to back
          </button>
          {sep}
          <button
            className={cn(item, "text-destructive hover:text-destructive")}
            onClick={() => run(deleteEl)}
          >
            <Trash2 size={14} className="shrink-0 text-destructive" /> Delete
          </button>
        </>
      ) : (
        <>
          <button className={item} onClick={() => run(selectAll)}>
            <BoxSelect size={14} className={iconCls} /> Select all
          </button>
          <button className={item} onClick={() => run(() => zoom(0.25))}>
            <ZoomIn size={14} className={iconCls} /> Zoom in
          </button>
          <button className={item} onClick={() => run(() => zoom(-0.25))}>
            <ZoomOut size={14} className={iconCls} /> Zoom out
          </button>
          <button className={item} onClick={() => run(resetView)}>
            <Maximize2 size={14} className={iconCls} /> Reset view
          </button>
          {sep}
          <button className={item} onClick={() => run(exportPng)}>
            <Download size={14} className={iconCls} /> Export PNG
          </button>
          {sep}
          <button className={item} onClick={() => run(() => {})}>
            <Clipboard size={14} className={iconCls} /> Paste
          </button>
        </>
      )}
    </div>
  );
}
