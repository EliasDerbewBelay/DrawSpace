"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type RefObject,
} from "react";
import {
  Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight,
  Minus, Plus,
} from "lucide-react";
import Konva from "konva";
import {
  Stage,
  Layer,
  Line,
  Rect,
  Circle as KonvaCircle,
  Arrow,
  Text,
  Group,
  Transformer,
  Shape,
} from "react-konva";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/store/canvasStore";
import type { CanvasElement, KonvaData, ToolType } from "@/types/canvas";
import { useTheme } from "next-themes";
import { useSync } from "@/hooks/useSync";
import { useUndoRedo } from "@/hooks/useUndoRedo";

/* ─── types ──────────────────────────────────────────────── */

interface Props {
  boardId: string;
  userId: string;
  stageRef: RefObject<Konva.Stage | null>;
  onContextMenu?: (pos: { x: number; y: number }, elementId: string | null) => void;
}

interface TextEditor {
  id: string;
  x: number;
  y: number;
  width: number;
  text: string;
  fontSize: number;
}

interface StickyEditState {
  id:        string;
  x:         number;
  y:         number;
  width:     number;
  height:    number;
  text:      string;
  fontSize:  number;
  color:     string;
  bold:      boolean;
  italic:    boolean;
  underline: boolean;
  align:     "left" | "center" | "right";
}

const STICKY_FONT_SIZES = [11, 13, 16, 20] as const;

function adjustStickyFontSize(size: number, dir: -1 | 1): number {
  const sorted = [...STICKY_FONT_SIZES].sort((a, b) => a - b);
  if (dir === 1) {
    return sorted.find((s) => s > size) ?? sorted[sorted.length - 1];
  }
  return [...sorted].reverse().find((s) => s < size) ?? sorted[0];
}

function toKonvaFontStyle(bold: boolean, italic: boolean): string {
  if (bold && italic) return "bold italic";
  if (bold) return "bold";
  if (italic) return "italic";
  return "normal";
}

function parseKonvaFontStyle(fontStyle?: string) {
  const s = fontStyle ?? "normal";
  return { bold: s.includes("bold"), italic: s.includes("italic") };
}

const STICKY_COLORS = ["#FAC775", "#97C459", "#3ECFCF", "#F0997B", "#D4537E", "#A09AFF", "#F1F0E8"];

interface SelectionBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/* ─── constants ──────────────────────────────────────────── */

const TOOL_CURSOR: Record<ToolType, string> = {
  select: "default",
  pen: "crosshair",
  rect: "crosshair",
  circle: "crosshair",
  arrow: "crosshair",
  text: "text",
  sticky: "copy",
  eraser: "cell",
};

const CURSOR_COLORS = [
  "#6C63FF", "#3ECFCF", "#F0997B", "#FAC775",
  "#97C459", "#D4537E", "#60A5FA", "#A78BFA",
];

const CURSOR_POINTS = [0, 0, 0, 14, 3.5, 10, 6, 17, 8.5, 16, 6, 9, 11, 9];

/* ─── helpers ─────────────────────────────────────────────── */

function cursorColor(uid: string): string {
  return CURSOR_COLORS[uid.charCodeAt(0) % CURSOR_COLORS.length];
}

function mergeData(el: CanvasElement, delta: Partial<KonvaData>): CanvasElement {
  return { ...el, data: { ...el.data, ...delta }, updatedAt: Date.now() };
}

function intersects(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function isBackgroundTarget(target: Konva.Node): boolean {
  const stage = target.getStage();
  if (!stage || target === stage) return true;
  return target.getType() === "Layer";
}

/* ─── component ──────────────────────────────────────────── */

export default function WhiteboardCanvas({ boardId, userId, stageRef, onContextMenu }: Props) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const { emitDraw, emitUpdate, emitDelete, emitCursor, remoteCursors } =
    useSync(boardId, userId);

  useUndoRedo({ emitDraw, emitUpdate, emitDelete });

  const {
    activeTool,
    strokeColor,
    fillColor,
    strokeWidth,
    elements,
    selectedIds,
    setSelectedIds,
    setSelectedId,
    toggleSelectedId,
    addElement,
    updateElement,
    deleteElement,
    deleteElements,
    showGrid,
    canvasBackground,
    setTool,
    setStageScale,
  } = useCanvasStore();

  /* drawing state */
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<number[]>([]);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [endPos, setEndPos] = useState<{ x: number; y: number } | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [textEditor, setTextEditor] = useState<TextEditor | null>(null);

  const [stickyEdit, setStickyEdit] = useState<StickyEditState | null>(null);
  const [isErasing, setIsErasing]   = useState(false);
  const [spaceHeld, setSpaceHeld]   = useState(false);

  const transformerRef      = useRef<Konva.Transformer | null>(null);
  const lastPlacedAt        = useRef<number>(0);
  const textEditorOpenedAt  = useRef<number>(0);
  const stickyEditorRef     = useRef<HTMLDivElement | null>(null);
  const stickyPanelRef      = useRef<HTMLDivElement | null>(null);
  const erasedStrokeRef     = useRef<Set<string>>(new Set());
  const groupDragRef        = useRef<{
    anchorId: string;
    startX: number;
    startY: number;
    positions: Map<string, { x: number; y: number }>;
  } | null>(null);

  /* stage dimensions */
  const [dims, setDims] = useState({ width: 0, height: 0 });

  useEffect(() => {
    function measure() {
      setDims({ width: window.innerWidth - 44, height: window.innerHeight - 56 });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  /* cursor style */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const cursor =
      activeTool === "select" && spaceHeld ? "grab" : TOOL_CURSOR[activeTool];
    stage.container().style.cursor = cursor;
  }, [activeTool, spaceHeld, stageRef]);

  /* Space + drag pans the canvas while in select mode */
  useEffect(() => {
    function isTypingTarget(el: EventTarget | null) {
      const node = el as HTMLElement | null;
      if (!node?.tagName) return false;
      return node.tagName === "INPUT" || node.tagName === "TEXTAREA" || node.isContentEditable;
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== "Space" || e.repeat || isTypingTarget(e.target)) return;
      e.preventDefault();
      setSpaceHeld(true);
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") setSpaceHeld(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  /* attach Transformer to all selected nodes */
  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    if (selectedIds.length === 0) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }

    const nodes = selectedIds
      .map((id) => stage.findOne(`#${id}`))
      .filter((n): n is Konva.Node => n !== undefined && n !== null);

    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, elements, stageRef]);

  /* ── Keyboard: Delete, Select all ───────────────────────── */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        if (activeTool !== "select") return;
        e.preventDefault();
        setSelectedIds(elements.map((el) => el.elementId));
        return;
      }

      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (selectedIds.length === 0) return;

      e.preventDefault();
      const ids = [...selectedIds];
      deleteElements(ids);
      ids.forEach((id) => emitDelete(id));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTool, elements, selectedIds, deleteElements, emitDelete, setSelectedIds]);

  /* dot-grid */
  const dotGrid = useMemo(() => {
    if (dims.width === 0 || !showGrid) return null;
    return (
      <Shape
        sceneFunc={(ctx) => {
          const raw = (ctx as unknown as { _context: CanvasRenderingContext2D })._context;
          raw.fillStyle = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
          for (let gx = 0; gx < dims.width; gx += 24) {
            for (let gy = 0; gy < dims.height; gy += 24) {
              raw.beginPath();
              raw.arc(gx, gy, 1, 0, Math.PI * 2);
              raw.fill();
            }
          }
        }}
        listening={false}
      />
    );
  }, [dims, showGrid, isDark]);

  /* ─── stage event handlers ────────────────────────────────── */

  function getPos(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = e.target.getStage();
    if (!stage) return null;
    return stage.getRelativePointerPosition() ?? stage.getPointerPosition();
  }

  const getElementIdFromNode = useCallback((node: Konva.Node): string | null => {
    const stage = stageRef.current;
    let current: Konva.Node | null = node;
    while (current && current !== stage) {
      const id = current.id();
      if (id && useCanvasStore.getState().elements.some((el) => el.elementId === id)) {
        return id;
      }
      current = current.parent;
    }
    return null;
  }, [stageRef]);

  const eraseElementById = useCallback(
    (elementId: string) => {
      if (erasedStrokeRef.current.has(elementId)) return;
      if (!useCanvasStore.getState().elements.some((el) => el.elementId === elementId)) return;
      erasedStrokeRef.current.add(elementId);
      deleteElement(elementId);
      emitDelete(elementId);
    },
    [deleteElement, emitDelete]
  );

  const eraseAtPointer = useCallback(
    (stage: Konva.Stage) => {
      const pos = stage.getPointerPosition();
      if (!pos) return;
      const node = stage.getIntersection(pos);
      if (!node) return;
      const id = getElementIdFromNode(node);
      if (id) eraseElementById(id);
    },
    [getElementIdFromNode, eraseElementById]
  );

  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const pos = getPos(e);
      if (!pos) return;

      /* ERASER — click or start drag-to-erase */
      if (activeTool === "eraser") {
        erasedStrokeRef.current.clear();
        setIsErasing(true);
        const stage = e.target.getStage();
        if (stage) eraseAtPointer(stage);
        return;
      }

      /* SELECT tool — rubber-band on empty canvas (Space+drag pans instead) */
      if (activeTool === "select") {
        if (spaceHeld) return;
        if (isBackgroundTarget(e.target)) {
          if (!e.evt.shiftKey && !e.evt.ctrlKey && !e.evt.metaKey) {
            setSelectedIds([]);
          }
          setSelectionBox({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y });
          setIsDrawing(true);
        }
        return;
      }

      /* drawing tools */
      if (activeTool === "pen") {
        setIsDrawing(true);
        setCurrentPoints([pos.x, pos.y]);
        return;
      }

      if (activeTool === "rect" || activeTool === "circle" || activeTool === "arrow") {
        setIsDrawing(true);
        setStartPos(pos);
        setEndPos(pos);
        return;
      }

      if (activeTool === "text") {
        /* only place new text on empty canvas — existing text is edited via its own handler */
        if (e.target !== e.target.getStage()) return;
        const now = Date.now();
        if (now - lastPlacedAt.current < 400) return;
        lastPlacedAt.current = now;
        const el: CanvasElement = {
          elementId: crypto.randomUUID(),
          type: "text",
          data: { x: pos.x, y: pos.y, text: "", fontSize: 16, fill: strokeColor, opacity: 1 },
          createdBy: userId,
          updatedAt: Date.now(),
        };
        addElement(el);
        emitDraw(el);
        setSelectedIds([]);
        openTextEditor(el, pos);
        return;
      }

      if (activeTool === "sticky") {
        const now = Date.now();
        if (now - lastPlacedAt.current < 400) return;
        lastPlacedAt.current = now;
        const el: CanvasElement = {
          elementId: crypto.randomUUID(),
          type: "sticky",
          data: { x: pos.x, y: pos.y, width: 200, height: 160, fill: "#FAC775", text: "", fontSize: 14, opacity: 1 },
          createdBy: userId,
          updatedAt: Date.now(),
        };
        addElement(el);
        emitDraw(el);
        /* open editor after Konva renders the new node, then select it */
        const elRef = el;
        setTimeout(() => {
          openStickyEditor(elRef);
          setSelectedId(elRef.elementId);
        }, 20);
        return;
      }
    },
    [activeTool, addElement, emitDraw, setSelectedIds, strokeColor, userId, stageRef, eraseAtPointer, spaceHeld]
  );

  const handleStageMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (pos) emitCursor(pos.x, pos.y);

      if (activeTool === "eraser" && isErasing && stage) {
        eraseAtPointer(stage);
        return;
      }

      if (!isDrawing || !pos) return;

      /* rubber-band */
      if (activeTool === "select" && selectionBox) {
        setSelectionBox((prev) => prev ? { ...prev, x2: pos.x, y2: pos.y } : null);
        return;
      }

      if (activeTool === "pen") {
        setCurrentPoints((prev) => [...prev, pos.x, pos.y]);
        return;
      }
      if (activeTool === "rect" || activeTool === "circle" || activeTool === "arrow") {
        setEndPos(pos);
      }
    },
    [isDrawing, isErasing, activeTool, selectionBox, emitCursor, eraseAtPointer]
  );

  const handleStageMouseUp = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const pos = getPos(e) ?? endPos;

      if (activeTool === "eraser" && isErasing) {
        setIsErasing(false);
        erasedStrokeRef.current.clear();
        return;
      }

      /* finish rubber-band selection */
      if (activeTool === "select" && isDrawing && selectionBox) {
        const stage = stageRef.current;
        if (stage) {
          const selRect = {
            x: Math.min(selectionBox.x1, selectionBox.x2),
            y: Math.min(selectionBox.y1, selectionBox.y2),
            width: Math.abs(selectionBox.x2 - selectionBox.x1),
            height: Math.abs(selectionBox.y2 - selectionBox.y1),
          };
          if (selRect.width > 4 && selRect.height > 4) {
            const selected: string[] = [];
            for (const el of elements) {
              const node = stage.findOne(`#${el.elementId}`);
              if (!node) continue;
              const box = node.getClientRect({ relativeTo: stage });
              if (intersects(selRect, box)) selected.push(el.elementId);
            }
            const additive = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
            if (additive) {
              setSelectedIds([...new Set([...selectedIds, ...selected])]);
            } else {
              setSelectedIds(selected);
            }
          }
        }
        setSelectionBox(null);
        setIsDrawing(false);
        return;
      }

      if (!isDrawing || !pos) return;

      /* pen */
      if (activeTool === "pen" && currentPoints.length >= 2) {
        const points =
          currentPoints.length >= 4
            ? currentPoints
            : [currentPoints[0], currentPoints[1], currentPoints[0] + 0.5, currentPoints[1] + 0.5];
        const el: CanvasElement = {
          elementId: crypto.randomUUID(),
          type: "pen",
          data: { points, stroke: strokeColor, strokeWidth, opacity: 1 },
          createdBy: userId,
          updatedAt: Date.now(),
        };
        addElement(el);
        emitDraw(el);
      }

      /* rect */
      if (activeTool === "rect" && startPos) {
        const x = Math.min(startPos.x, pos.x);
        const y = Math.min(startPos.y, pos.y);
        const w = Math.abs(pos.x - startPos.x);
        const h = Math.abs(pos.y - startPos.y);
        if (w > 4 && h > 4) {
          const el: CanvasElement = {
            elementId: crypto.randomUUID(),
            type: "rect",
            data: { x, y, width: w, height: h, fill: fillColor, stroke: strokeColor, strokeWidth, opacity: 1 },
            createdBy: userId,
            updatedAt: Date.now(),
          };
          addElement(el);
          emitDraw(el);
        }
      }

      /* circle */
      if (activeTool === "circle" && startPos) {
        const w = Math.abs(pos.x - startPos.x);
        const h = Math.abs(pos.y - startPos.y);
        if (w > 4 && h > 4) {
          const el: CanvasElement = {
            elementId: crypto.randomUUID(),
            type: "circle",
            data: {
              x: startPos.x + (pos.x - startPos.x) / 2,
              y: startPos.y + (pos.y - startPos.y) / 2,
              width: w, height: h, fill: fillColor, stroke: strokeColor, strokeWidth, opacity: 1,
            },
            createdBy: userId,
            updatedAt: Date.now(),
          };
          addElement(el);
          emitDraw(el);
        }
      }

      /* arrow */
      if (activeTool === "arrow" && startPos) {
        const dx = pos.x - startPos.x;
        const dy = pos.y - startPos.y;
        if (Math.hypot(dx, dy) > 8) {
          const el: CanvasElement = {
            elementId: crypto.randomUUID(),
            type: "arrow",
            data: { points: [startPos.x, startPos.y, pos.x, pos.y], stroke: strokeColor, strokeWidth, opacity: 1 },
            createdBy: userId,
            updatedAt: Date.now(),
          };
          addElement(el);
          emitDraw(el);
        }
      }

      setIsDrawing(false);
      setCurrentPoints([]);
      setStartPos(null);
      setEndPos(null);
    },
    [
      isDrawing, isErasing, activeTool, selectionBox, currentPoints, startPos, endPos, elements,
      selectedIds, addElement, emitDraw, fillColor, strokeColor, strokeWidth, userId, setSelectedIds, stageRef,
    ]
  );

  /* ─── text editor ─────────────────────────────────────────── */

  function openTextEditor(el: CanvasElement, canvasPos?: { x: number; y: number }) {
    const stage = stageRef.current;
    if (!stage) return;

    setSelectedIds([]);

    const scale = stage.scaleX();
    const fontSize = (el.data.fontSize ?? 16) * scale;
    const node = stage.findOne(`#${el.elementId}`);

    if (node) {
      const box = node.getClientRect({ relativeTo: stage });
      const containerRect = stage.container().getBoundingClientRect();
      textEditorOpenedAt.current = Date.now();
      setTextEditor({
        id: el.elementId,
        x: containerRect.left + box.x,
        y: containerRect.top + box.y,
        width: Math.max(120, (el.data.width ?? 200) * scale),
        text: el.data.text ?? "",
        fontSize,
      });
      return;
    }

    if (canvasPos) {
      const containerRect = stage.container().getBoundingClientRect();
      const screen = stage.getAbsoluteTransform().point(canvasPos);
      textEditorOpenedAt.current = Date.now();
      setTextEditor({
        id: el.elementId,
        x: containerRect.left + screen.x,
        y: containerRect.top + screen.y,
        width: Math.max(120, (el.data.width ?? 200) * scale),
        text: el.data.text ?? "",
        fontSize,
      });
      return;
    }

    const elRef = el;
    requestAnimationFrame(() => openTextEditor(elRef));
  }

  function commitTextEdit(value: string) {
    if (!textEditor) return;
    const id      = textEditor.id;
    const trimmed = value.trim();
    const el      = elements.find((e) => e.elementId === id);
    if (!trimmed) {
      deleteElement(id);
      emitDelete(id);
      setTextEditor(null);
    } else {
      const delta: Partial<KonvaData> = { text: trimmed };
      updateElement(id, delta);
      if (el) emitUpdate(mergeData(el, delta));
      setTextEditor(null);
      setSelectedId(id);
    }
  }

  /* ─── sticky editor ────────────────────────────────────────── */

  function openStickyEditor(el: CanvasElement) {
    const stage = stageRef.current;
    if (!stage) return;
    const node = stage.findOne(`#${el.elementId}`);
    if (!node) return;
    const absPos = node.getAbsolutePosition();
    const containerRect = stage.container().getBoundingClientRect();
    const scale = stage.scaleX();
    const { bold, italic } = parseKonvaFontStyle(el.data.fontStyle);
    setStickyEdit({
      id:        el.elementId,
      x:         containerRect.left + absPos.x * scale,
      y:         containerRect.top  + absPos.y * scale,
      width:     Math.max(160, (el.data.width  ?? 200) * scale),
      height:    Math.max(100, (el.data.height ?? 160) * scale),
      text:      el.data.text ?? "",
      fontSize:  el.data.fontSize ?? 14,
      color:     el.data.fill ?? "#FAC775",
      bold,
      italic,
      underline: el.data.textDecoration === "underline",
      align:     el.data.align ?? "left",
    });
  }

  function commitStickyEdit() {
    if (!stickyEdit) return;
    const id   = stickyEdit.id;
    const text = (stickyEditorRef.current?.innerText ?? stickyEdit.text).trim() || "New note";
    const el   = elements.find((e) => e.elementId === id);
    if (el) {
      const delta: Partial<KonvaData> = {
        text,
        fontSize: stickyEdit.fontSize,
        fontStyle: toKonvaFontStyle(stickyEdit.bold, stickyEdit.italic),
        textDecoration: stickyEdit.underline ? "underline" : undefined,
        align: stickyEdit.align,
      };
      updateElement(id, delta);
      emitUpdate(mergeData(el, delta));
    }
    setStickyEdit(null);
    setTool("select");
    setSelectedId(id);
  }

  function patchStickyFormat(patch: Partial<Pick<StickyEditState, "bold" | "italic" | "underline" | "align" | "fontSize">>) {
    setStickyEdit((prev) => (prev ? { ...prev, ...patch } : null));
  }

  /* focus sticky editor when it opens */
  useEffect(() => {
    if (!stickyEdit) return;
    const node = stickyEditorRef.current;
    if (!node) return;
    node.textContent = stickyEdit.text;
    node.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [stickyEdit?.id]);

  /* save when clicking outside the sticky editor */
  useEffect(() => {
    if (!stickyEdit) return;
    function onPointerDown(e: PointerEvent) {
      const panel = stickyPanelRef.current;
      if (panel && !panel.contains(e.target as Node)) commitStickyEdit();
    }
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [stickyEdit]);

  function changeStickyColor(color: string) {
    if (!stickyEdit) return;
    setStickyEdit((prev) => prev ? { ...prev, color } : null);
    const el = elements.find((e) => e.elementId === stickyEdit.id);
    if (el) {
      const delta: Partial<KonvaData> = { fill: color };
      updateElement(stickyEdit.id, delta);
      emitUpdate(mergeData(el, delta));
    }
  }

  /* ─── element event factories ───────────────────────────────── */

  function isMultiSelectModifier(e: Konva.KonvaEventObject<MouseEvent>) {
    return e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
  }

  function handleElementSelect(elId: string, e: Konva.KonvaEventObject<MouseEvent>) {
    if (activeTool !== "select" || spaceHeld) return;
    e.cancelBubble = true;
    const isSelected = selectedIds.includes(elId);
    if (isMultiSelectModifier(e)) {
      toggleSelectedId(elId);
    } else if (!isSelected) {
      setSelectedId(elId);
    }
  }

  function syncNodePosition(el: CanvasElement, node: Konva.Node) {
    const delta: Partial<KonvaData> = {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
    };
    updateElement(el.elementId, delta);
    emitUpdate(mergeData(el, delta));
  }

  function canDragInSelect() {
    return activeTool === "select" && !spaceHeld;
  }

  function handleDragStart(el: CanvasElement, e: Konva.KonvaEventObject<DragEvent>) {
    e.cancelBubble = true;
    const elId = el.elementId;

    if (!selectedIds.includes(elId)) {
      setSelectedId(elId);
      return;
    }

    if (selectedIds.length <= 1) return;

    const stage = stageRef.current;
    if (!stage) return;

    const positions = new Map<string, { x: number; y: number }>();
    for (const id of selectedIds) {
      const node = stage.findOne(`#${id}`);
      if (node) positions.set(id, { x: node.x(), y: node.y() });
    }

    groupDragRef.current = {
      anchorId: elId,
      startX: e.target.x(),
      startY: e.target.y(),
      positions,
    };
  }

  function handleDragMove(el: CanvasElement, e: Konva.KonvaEventObject<DragEvent>) {
    const gd = groupDragRef.current;
    if (!gd || gd.anchorId !== el.elementId || selectedIds.length <= 1) return;

    const dx = e.target.x() - gd.startX;
    const dy = e.target.y() - gd.startY;
    const stage = stageRef.current;
    if (!stage) return;

    for (const [id, pos] of gd.positions) {
      if (id === el.elementId) continue;
      const node = stage.findOne(`#${id}`);
      if (node) node.position({ x: pos.x + dx, y: pos.y + dy });
    }
    stage.batchDraw();
  }

  function handleDragEnd(el: CanvasElement, e: Konva.KonvaEventObject<DragEvent>) {
    const gd = groupDragRef.current;

    if (gd && gd.anchorId === el.elementId && selectedIds.length > 1) {
      const dx = e.target.x() - gd.startX;
      const dy = e.target.y() - gd.startY;
      for (const [id, pos] of gd.positions) {
        const target = elements.find((item) => item.elementId === id);
        if (!target) continue;
        const delta: Partial<KonvaData> = { x: pos.x + dx, y: pos.y + dy };
        updateElement(id, delta);
        emitUpdate(mergeData(target, delta));
      }
      groupDragRef.current = null;
      return;
    }

    groupDragRef.current = null;
    syncNodePosition(el, e.target);
  }

  function makeSharedHandlers(el: CanvasElement) {
    const baseOpacity = el.data.opacity ?? 1;

    function eraserHover(node: Konva.Node, active: boolean) {
      if (activeTool !== "eraser") return;
      const target = node.getType() === "Group" ? node : node;
      target.opacity(active ? baseOpacity * 0.4 : baseOpacity);
      target.getLayer()?.batchDraw();
    }

    return {
      id: el.elementId,
      draggable: canDragInSelect(),
      onDragStart: (e: Konva.KonvaEventObject<DragEvent>) => handleDragStart(el, e),
      onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => handleDragMove(el, e),
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => handleDragEnd(el, e),
      onMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (activeTool === "eraser") {
          e.cancelBubble = true;
          if (!isErasing) {
            erasedStrokeRef.current.clear();
            setIsErasing(true);
          }
          eraseElementById(el.elementId);
          return;
        }
        if (activeTool === "text" && el.type === "text") {
          e.cancelBubble = true;
          openTextEditor(el);
          return;
        }
        handleElementSelect(el.elementId, e);
      },
      onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (activeTool === "text" && el.type === "text") {
          e.cancelBubble = true;
          return;
        }
        if (activeTool === "select") {
          e.cancelBubble = true;
        }
      },
      onMouseEnter: (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (activeTool === "eraser") {
          eraserHover(e.target, true);
          stageRef.current?.container().style.setProperty("cursor", "cell");
        }
      },
      onMouseLeave: (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (activeTool === "eraser") {
          eraserHover(e.target, false);
        }
      },
    };
  }

  function makeTransformEnd(el: CanvasElement) {
    return (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target as Konva.Shape;
      const sx = node.scaleX();
      const sy = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      const delta: Partial<KonvaData> = {
        x: node.x(), y: node.y(),
        width: Math.max(8, (el.data.width ?? 100) * sx),
        height: Math.max(8, (el.data.height ?? 100) * sy),
        rotation: node.rotation(),
      };
      updateElement(el.elementId, delta);
      emitUpdate(mergeData(el, delta));
    };
  }

  /* ─── element renderer ─────────────────────────────────────── */

  function renderElement(el: CanvasElement) {
    const shared = makeSharedHandlers(el);
    const onTransformEnd = makeTransformEnd(el);
    const opacity = el.data.opacity ?? 1;

    switch (el.type) {
      case "pen": {
        const sw = el.data.strokeWidth ?? 2;
        return (
          <Line key={el.elementId} {...shared}
            x={el.data.x ?? 0} y={el.data.y ?? 0}
            points={el.data.points ?? []}
            stroke={el.data.stroke ?? "#6C63FF"}
            strokeWidth={sw}
            hitStrokeWidth={Math.max(28, sw * 8)}
            tension={0.5} lineCap="round" lineJoin="round" opacity={opacity}
            onTransformEnd={(e) => syncNodePosition(el, e.target)}
          />
        );
      }

      case "rect":
        return (
          <Rect key={el.elementId} {...shared}
            x={el.data.x ?? 0} y={el.data.y ?? 0}
            width={el.data.width ?? 100} height={el.data.height ?? 100}
            fill={el.data.fill === "transparent" ? undefined : el.data.fill}
            stroke={el.data.stroke ?? "#6C63FF"} strokeWidth={el.data.strokeWidth ?? 2}
            rotation={el.data.rotation ?? 0} opacity={opacity}
            onTransformEnd={onTransformEnd}
          />
        );

      case "circle": {
        const radius = Math.min(el.data.width ?? 100, el.data.height ?? 100) / 2;
        return (
          <KonvaCircle key={el.elementId} {...shared}
            x={el.data.x ?? 0} y={el.data.y ?? 0} radius={radius}
            fill={el.data.fill === "transparent" ? undefined : el.data.fill}
            stroke={el.data.stroke ?? "#6C63FF"} strokeWidth={el.data.strokeWidth ?? 2}
            rotation={el.data.rotation ?? 0} opacity={opacity}
            onTransformEnd={(e) => {
              const node = e.target as Konva.Circle;
              const sx = node.scaleX();
              node.scaleX(1); node.scaleY(1);
              const delta: Partial<KonvaData> = {
                x: node.x(), y: node.y(),
                width: Math.max(8, (el.data.width ?? 100) * sx),
                height: Math.max(8, (el.data.width ?? 100) * sx),
                rotation: node.rotation(),
              };
              updateElement(el.elementId, delta);
              emitUpdate(mergeData(el, delta));
            }}
          />
        );
      }

      case "arrow": {
        const sw = el.data.strokeWidth ?? 2;
        return (
          <Arrow key={el.elementId} {...shared}
            x={el.data.x ?? 0} y={el.data.y ?? 0}
            points={el.data.points ?? [0, 0, 100, 0]}
            stroke={el.data.stroke ?? "#6C63FF"} strokeWidth={sw}
            hitStrokeWidth={Math.max(28, sw * 8)}
            fill={el.data.stroke ?? "#6C63FF"}
            pointerLength={10} pointerWidth={8} opacity={opacity}
            onTransformEnd={(e) => syncNodePosition(el, e.target)}
          />
        );
      }

      case "text":
        return (
          <Text key={el.elementId} {...shared}
            x={el.data.x ?? 0} y={el.data.y ?? 0}
            width={el.data.width}
            text={el.data.text || "Double click to edit"}
            fontSize={el.data.fontSize ?? 16}
            fill={el.data.fill ?? "#ffffff"}
            rotation={el.data.rotation ?? 0} opacity={opacity}
            hitStrokeWidth={12}
            onTransformEnd={(e) => {
              const node = e.target as Konva.Text;
              const sx = node.scaleX();
              const sy = node.scaleY();
              node.scaleX(1);
              node.scaleY(1);
              const delta: Partial<KonvaData> = {
                x: node.x(),
                y: node.y(),
                rotation: node.rotation(),
              };
              if (sx !== 1 || sy !== 1) {
                const baseW = node.width() || node.getTextWidth() || 120;
                delta.width = Math.max(40, baseW * sx);
                node.width(delta.width);
              }
              updateElement(el.elementId, delta);
              emitUpdate(mergeData(el, delta));
            }}
            onDblClick={() => openTextEditor(el)}
          />
        );

      case "sticky": {
        const sw = el.data.width  ?? 200;
        const sh = el.data.height ?? 160;
        const noteText = el.data.text ?? "";
        return (
          <Group key={el.elementId} id={el.elementId}
            x={el.data.x ?? 0} y={el.data.y ?? 0}
            draggable={canDragInSelect()} opacity={opacity}
            onDragStart={(e) => handleDragStart(el, e)}
            onDragMove={(e) => handleDragMove(el, e)}
            onDragEnd={(e) => handleDragEnd(el, e)}
            onMouseDown={(e: Konva.KonvaEventObject<MouseEvent>) => {
              if (activeTool === "eraser") {
                e.cancelBubble = true;
                if (!isErasing) {
                  erasedStrokeRef.current.clear();
                  setIsErasing(true);
                }
                eraseElementById(el.elementId);
                return;
              }
              handleElementSelect(el.elementId, e);
            }}
            onClick={(e: Konva.KonvaEventObject<MouseEvent>) => {
              if (activeTool === "select") e.cancelBubble = true;
            }}
            onMouseEnter={() => {
              if (activeTool === "eraser") {
                stageRef.current?.container().style.setProperty("cursor", "cell");
              }
            }}
            onTransformEnd={(e: Konva.KonvaEventObject<Event>) => {
              const node = e.target as Konva.Group;
              const sx = node.scaleX(); const sy = node.scaleY();
              node.scaleX(1); node.scaleY(1);
              const delta: Partial<KonvaData> = {
                x: node.x(), y: node.y(),
                width:  Math.max(80, sw * sx),
                height: Math.max(60, sh * sy),
                rotation: node.rotation(),
              };
              updateElement(el.elementId, delta); emitUpdate(mergeData(el, delta));
            }}
            onDblClick={() => openStickyEditor(el)}
          >
            {/* note body — listening so the group receives pointer hits */}
            <Rect
              width={sw} height={sh}
              fill={el.data.fill ?? "#FAC775"} cornerRadius={6}
              shadowBlur={8} shadowColor="rgba(0,0,0,0.22)" shadowOffsetY={3}
              listening
              onMouseEnter={(e) => {
                if (activeTool === "eraser") {
                  (e.target.getParent() as Konva.Group)?.opacity(opacity * 0.4);
                  e.target.getLayer()?.batchDraw();
                }
              }}
              onMouseLeave={(e) => {
                if (activeTool === "eraser") {
                  (e.target.getParent() as Konva.Group)?.opacity(opacity);
                  e.target.getLayer()?.batchDraw();
                }
              }}
            />
            {/* top fold strip */}
            <Rect
              width={sw} height={22}
              fill="rgba(0,0,0,0.07)" cornerRadius={[6, 6, 0, 0]}
              listening={false}
            />
            {/* note text or placeholder */}
            <Text
              y={28}
              text={noteText || "Double-click to edit…"}
              fontSize={el.data.fontSize ?? 14}
              fill={noteText ? "#1a1a1a" : "rgba(0,0,0,0.35)"}
              fontStyle={noteText ? (el.data.fontStyle ?? "normal") : "italic"}
              textDecoration={noteText ? el.data.textDecoration : undefined}
              align={el.data.align ?? "left"}
              padding={10}
              width={sw}
              height={sh - 28}
              wrap="word"
              listening={false}
            />
          </Group>
        );
      }

      default:
        return null;
    }
  }

  /* ─── live preview ─────────────────────────────────────────── */

  function renderLivePreview() {
    /* rubber-band selection rectangle */
    if (activeTool === "select" && selectionBox) {
      return (
        <Rect
          x={Math.min(selectionBox.x1, selectionBox.x2)}
          y={Math.min(selectionBox.y1, selectionBox.y2)}
          width={Math.abs(selectionBox.x2 - selectionBox.x1)}
          height={Math.abs(selectionBox.y2 - selectionBox.y1)}
          fill="rgba(108,99,255,0.08)"
          stroke="#6C63FF"
          strokeWidth={1}
          dash={[4, 4]}
          listening={false}
        />
      );
    }

    if (!isDrawing) return null;

    if (activeTool === "pen" && currentPoints.length >= 2) {
      return (
        <Line points={currentPoints} stroke={strokeColor} strokeWidth={strokeWidth}
          tension={0.5} lineCap="round" lineJoin="round" listening={false} opacity={0.85}
        />
      );
    }

    if (!startPos || !endPos) return null;

    const x = Math.min(startPos.x, endPos.x);
    const y = Math.min(startPos.y, endPos.y);
    const w = Math.abs(endPos.x - startPos.x);
    const h = Math.abs(endPos.y - startPos.y);

    if (activeTool === "rect") {
      return (
        <Rect x={x} y={y} width={w} height={h}
          fill={fillColor === "transparent" ? undefined : fillColor}
          stroke={strokeColor} strokeWidth={strokeWidth}
          listening={false} opacity={0.75} dash={[4, 4]}
        />
      );
    }

    if (activeTool === "circle") {
      return (
        <KonvaCircle
          x={startPos.x + (endPos.x - startPos.x) / 2}
          y={startPos.y + (endPos.y - startPos.y) / 2}
          radius={Math.min(w, h) / 2}
          fill={fillColor === "transparent" ? undefined : fillColor}
          stroke={strokeColor} strokeWidth={strokeWidth}
          listening={false} opacity={0.75} dash={[4, 4]}
        />
      );
    }

    if (activeTool === "arrow") {
      return (
        <Arrow
          points={[startPos.x, startPos.y, endPos.x, endPos.y]}
          stroke={strokeColor} strokeWidth={strokeWidth}
          fill={strokeColor} pointerLength={10} pointerWidth={8}
          listening={false} opacity={0.75}
        />
      );
    }

    return null;
  }

  /* ─── remote cursors ───────────────────────────────────────── */

  function renderRemoteCursors() {
    return [...remoteCursors.entries()].map(([uid, pos]) => {
      const color = cursorColor(uid);
      return (
        <Group key={uid} x={pos.x} y={pos.y} listening={false}>
          <Line points={CURSOR_POINTS} closed fill={color}
            stroke="rgba(0,0,0,0.4)" strokeWidth={0.5}
          />
          <Text
            text={uid.replace(/^user_/, "").slice(0, 8)}
            x={14} y={2} fontSize={10} fill={color} fontStyle="bold"
            shadowColor="rgba(0,0,0,0.7)" shadowBlur={3}
            shadowOffsetX={1} shadowOffsetY={1}
          />
        </Group>
      );
    });
  }

  /* ─── render ───────────────────────────────────────────────── */

  function handleContextMenu(e: Konva.KonvaEventObject<MouseEvent>) {
    e.evt.preventDefault();
    if (!onContextMenu) return;
    const stage = stageRef.current;
    const hitId = e.target === stage ? null : (e.target.id() || null);
    onContextMenu({ x: e.evt.clientX, y: e.evt.clientY }, hitId);
  }

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.05;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clamped = Math.min(4, Math.max(0.25, newScale));

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    stage.scale({ x: clamped, y: clamped });
    stage.position({
      x: pointer.x - mousePointTo.x * clamped,
      y: pointer.y - mousePointTo.y * clamped,
    });
    stage.batchDraw();
    setStageScale(clamped);
  }

  if (dims.width === 0) return null;

  /* empty canvas hint */
  const showHint = elements.length === 0 && activeTool === "pen";

  return (
    <div
      className={cn(
        "relative flex-1 overflow-hidden",
        !canvasBackground && "bg-canvas"
      )}
      style={canvasBackground ? { backgroundColor: canvasBackground } : undefined}
    >
      {showHint && (
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground/40"
          aria-hidden
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
            <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>
          </svg>
          <p className="text-[16px]">Start drawing</p>
          <p className="text-[13px] opacity-70">Click and drag to draw a stroke</p>
        </div>
      )}
      <Stage
        ref={stageRef}
        width={dims.width}
        height={dims.height}
        draggable={activeTool === "select" && spaceHeld}
        onMouseDown={handleStageMouseDown}
        onDragStart={() => {
          stageRef.current?.container().style.setProperty("cursor", "grabbing");
        }}
        onDragEnd={() => {
          if (activeTool === "select" && spaceHeld) {
            stageRef.current?.container().style.setProperty("cursor", "grab");
          }
        }}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
      >
        <Layer listening={false}>{dotGrid}</Layer>

        <Layer>
          {elements.map(renderElement)}
          {renderLivePreview()}
          {selectedIds.length > 0 && (
            <Transformer
              ref={transformerRef}
              rotateEnabled
              keepRatio={false}
              boundBoxFunc={(oldBox, newBox) =>
                newBox.width < 8 || newBox.height < 8 ? oldBox : newBox
              }
            />
          )}
        </Layer>

        <Layer listening={false}>{renderRemoteCursors()}</Layer>
      </Stage>

      {/* ── regular text editor ── */}
      {textEditor && (
        <textarea
          key={textEditor.id}
          autoFocus
          className="fixed z-50 resize-none rounded border-2 border-primary bg-popover px-1.5 py-1 text-foreground outline-none shadow-lg"
          style={{
            left: textEditor.x, top: textEditor.y,
            minWidth: Math.max(120, textEditor.width),
            fontSize: textEditor.fontSize,
            color: strokeColor,
            lineHeight: 1.4, fontFamily: "inherit",
          }}
          defaultValue={textEditor.text}
          rows={3}
          onMouseDown={(e) => e.stopPropagation()}
          onBlur={(e) => {
            if (Date.now() - textEditorOpenedAt.current < 250) return;
            commitTextEdit(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              commitTextEdit((e.target as HTMLTextAreaElement).value);
            }
            if (e.key === "Escape") {
              const trimmed = (e.target as HTMLTextAreaElement).value.trim();
              if (!trimmed) {
                deleteElement(textEditor.id);
                emitDelete(textEditor.id);
              }
              setTextEditor(null);
            }
          }}
        />
      )}

      {/* ── sticky note editor overlay ── */}
      <style>{`
        .sticky-editor-body:empty::before {
          content: attr(data-placeholder);
          color: rgba(0,0,0,0.35);
          font-style: italic;
          pointer-events: none;
        }
      `}</style>

      {stickyEdit && (
        <div
          ref={stickyPanelRef}
          className="fixed z-50 flex flex-col overflow-hidden"
          style={{
            left:      stickyEdit.x,
            top:       stickyEdit.y,
            width:     stickyEdit.width,
            minHeight: stickyEdit.height,
            background:   stickyEdit.color,
            borderRadius: 8,
            boxShadow:
              "0 0 0 2px rgba(0,0,0,0.10), 0 8px 24px rgba(0,0,0,0.30)",
          }}
          /* stop right-click inside editor from propagating to canvas */
          onContextMenu={(e) => e.stopPropagation()}
        >
          {/* top handle bar with color picker + done */}
          <div
            className="flex items-center justify-between px-2.5 flex-shrink-0"
            style={{ background: "rgba(0,0,0,0.10)", height: 28 }}
          >
            <div className="flex items-center gap-1">
              {STICKY_COLORS.map((c) => (
                <button
                  key={c}
                  onMouseDown={(e) => { e.preventDefault(); changeStickyColor(c); }}
                  className="rounded-full transition-transform hover:scale-125 active:scale-95"
                  style={{
                    width:  13,
                    height: 13,
                    background: c,
                    border:   "none",
                    cursor:   "pointer",
                    outline:  stickyEdit.color === c ? "2px solid rgba(0,0,0,0.45)" : "1px solid rgba(0,0,0,0.15)",
                    outlineOffset: stickyEdit.color === c ? 1 : 0,
                  }}
                  title={c}
                />
              ))}
            </div>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                commitStickyEdit();
              }}
              className="flex items-center gap-1 rounded px-2 text-[11px] font-semibold transition-colors"
              style={{
                background: "rgba(0,0,0,0.12)",
                color: "rgba(0,0,0,0.55)",
                border: "none",
                cursor: "pointer",
                height: 18,
              }}
            >
              ✓ Done
            </button>
          </div>

          {/* formatting toolbar */}
          <div
            className="flex items-center gap-0.5 px-2 flex-shrink-0 flex-wrap"
            style={{ background: "rgba(0,0,0,0.06)", minHeight: 30, paddingTop: 4, paddingBottom: 4 }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {([
              { key: "bold", icon: <Bold size={13} />, active: stickyEdit.bold, toggle: () => patchStickyFormat({ bold: !stickyEdit.bold }) },
              { key: "italic", icon: <Italic size={13} />, active: stickyEdit.italic, toggle: () => patchStickyFormat({ italic: !stickyEdit.italic }) },
              { key: "underline", icon: <Underline size={13} />, active: stickyEdit.underline, toggle: () => patchStickyFormat({ underline: !stickyEdit.underline }) },
            ] as const).map(({ key, icon, active, toggle }) => (
              <button
                key={key}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); toggle(); stickyEditorRef.current?.focus(); }}
                className="flex h-6 w-6 items-center justify-center rounded transition-colors"
                style={{
                  background: active ? "rgba(0,0,0,0.18)" : "transparent",
                  color: active ? "#1a1a1a" : "rgba(0,0,0,0.45)",
                  border: "none",
                  cursor: "pointer",
                }}
                title={key}
              >
                {icon}
              </button>
            ))}

            <div className="mx-1 h-4 w-px" style={{ background: "rgba(0,0,0,0.12)" }} />

            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                patchStickyFormat({ fontSize: adjustStickyFontSize(stickyEdit.fontSize, -1) });
                stickyEditorRef.current?.focus();
              }}
              className="flex h-6 w-6 items-center justify-center rounded"
              style={{ background: "transparent", border: "none", color: "rgba(0,0,0,0.45)", cursor: "pointer" }}
              title="Smaller text"
            >
              <Minus size={13} />
            </button>
            <span
              className="min-w-[28px] text-center text-[11px] font-medium select-none"
              style={{ color: "rgba(0,0,0,0.55)" }}
            >
              {stickyEdit.fontSize}
            </span>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                patchStickyFormat({ fontSize: adjustStickyFontSize(stickyEdit.fontSize, 1) });
                stickyEditorRef.current?.focus();
              }}
              className="flex h-6 w-6 items-center justify-center rounded"
              style={{ background: "transparent", border: "none", color: "rgba(0,0,0,0.45)", cursor: "pointer" }}
              title="Larger text"
            >
              <Plus size={13} />
            </button>

            <div className="mx-1 h-4 w-px" style={{ background: "rgba(0,0,0,0.12)" }} />

            {([
              { align: "left" as const, icon: <AlignLeft size={13} /> },
              { align: "center" as const, icon: <AlignCenter size={13} /> },
              { align: "right" as const, icon: <AlignRight size={13} /> },
            ]).map(({ align, icon }) => (
              <button
                key={align}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  patchStickyFormat({ align });
                  stickyEditorRef.current?.focus();
                }}
                className="flex h-6 w-6 items-center justify-center rounded transition-colors"
                style={{
                  background: stickyEdit.align === align ? "rgba(0,0,0,0.18)" : "transparent",
                  color: stickyEdit.align === align ? "#1a1a1a" : "rgba(0,0,0,0.45)",
                  border: "none",
                  cursor: "pointer",
                }}
                title={`Align ${align}`}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* editable content area */}
          <div
            key={stickyEdit.id}
            ref={stickyEditorRef}
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Write your note…"
            className="sticky-editor-body flex-1 w-full outline-none overflow-auto"
            style={{
              padding:        "8px 12px",
              fontSize:       Math.max(11, stickyEdit.fontSize),
              color:          "#1a1a1a",
              fontFamily:     "inherit",
              lineHeight:     1.55,
              minHeight:      stickyEdit.height - 62,
              fontWeight:     stickyEdit.bold ? "bold" : "normal",
              fontStyle:      stickyEdit.italic ? "italic" : "normal",
              textDecoration: stickyEdit.underline ? "underline" : "none",
              textAlign:      stickyEdit.align,
              border:         "none",
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                commitStickyEdit();
              }
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                commitStickyEdit();
              }
            }}
          />

          {/* resize hint */}
          <div
            className="text-center pb-1 text-[9px] select-none"
            style={{ color: "rgba(0,0,0,0.30)" }}
          >
            Esc or ⌘↵ to save
          </div>
        </div>
      )}
    </div>
  );
}
