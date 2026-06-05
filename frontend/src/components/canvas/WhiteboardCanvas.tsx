"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type RefObject,
} from "react";
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
import { useCanvasStore } from "@/store/canvasStore";
import type { CanvasElement, KonvaData, ToolType } from "@/types/canvas";

/* ─── types ──────────────────────────────────────────────── */

interface Props {
  boardId: string;
  userId: string;
  stageRef: RefObject<Konva.Stage | null>;
}

interface TextEditor {
  id: string;
  x: number;
  y: number;
  width: number;
  text: string;
  fontSize: number;
}

/* ─── cursor map ─────────────────────────────────────────── */

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

/* ─── component ──────────────────────────────────────────── */

export default function WhiteboardCanvas({ boardId: _boardId, userId, stageRef }: Props) {
  /* store */
  const {
    activeTool,
    strokeColor,
    fillColor,
    strokeWidth,
    elements,
    selectedId,
    addElement,
    updateElement,
    deleteElement,
    setSelectedId,
  } = useCanvasStore();

  /* local drawing state */
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<number[]>([]);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [endPos, setEndPos] = useState<{ x: number; y: number } | null>(null);
  const [textEditor, setTextEditor] = useState<TextEditor | null>(null);

  /* konva refs */
  const transformerRef = useRef<Konva.Transformer | null>(null);

  /* stage dimensions */
  const [dims, setDims] = useState({ width: 0, height: 0 });

  useEffect(() => {
    function measure() {
      setDims({
        width: window.innerWidth - 44,
        height: window.innerHeight - 56,
      });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  /* cursor */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.container().style.cursor = TOOL_CURSOR[activeTool];
  }, [activeTool, stageRef]);

  /* attach transformer to selected node */
  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    if (!selectedId) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }

    const node = stage.findOne(`#${selectedId}`);
    if (node) {
      tr.nodes([node]);
      tr.getLayer()?.batchDraw();
    }
  }, [selectedId, elements, stageRef]);

  /* dot-grid rendered once per dimension change */
  const dotGrid = useMemo(() => {
    if (dims.width === 0) return null;
    return (
      <Shape
        sceneFunc={(ctx) => {
          const raw = (ctx as unknown as { _context: CanvasRenderingContext2D })._context;
          raw.fillStyle = "rgba(255,255,255,0.08)";
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
  }, [dims]);

  /* ─── event helpers ──────────────────────────────────────── */

  function getPos(e: Konva.KonvaEventObject<MouseEvent>) {
    return e.target.getStage()?.getPointerPosition() ?? null;
  }

  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const pos = getPos(e);
      if (!pos) return;

      if (activeTool === "select") {
        if (e.target === e.target.getStage()) setSelectedId(null);
        return;
      }

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
        addElement({
          elementId: crypto.randomUUID(),
          type: "text",
          data: {
            x: pos.x,
            y: pos.y,
            text: "Double click to edit",
            fontSize: 16,
            fill: strokeColor,
            opacity: 1,
          },
          createdBy: userId,
          updatedAt: Date.now(),
        });
        return;
      }

      if (activeTool === "sticky") {
        addElement({
          elementId: crypto.randomUUID(),
          type: "sticky",
          data: {
            x: pos.x,
            y: pos.y,
            width: 160,
            height: 120,
            fill: "#FAC775",
            text: "New note",
            fontSize: 13,
            opacity: 1,
          },
          createdBy: userId,
          updatedAt: Date.now(),
        });
        return;
      }
    },
    [activeTool, addElement, setSelectedId, strokeColor, userId]
  );

  const handleStageMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isDrawing) return;
      const pos = getPos(e);
      if (!pos) return;

      if (activeTool === "pen") {
        setCurrentPoints((prev) => [...prev, pos.x, pos.y]);
        return;
      }
      if (activeTool === "rect" || activeTool === "circle" || activeTool === "arrow") {
        setEndPos(pos);
      }
    },
    [isDrawing, activeTool]
  );

  const handleStageMouseUp = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isDrawing) return;
      const pos = getPos(e) ?? endPos;
      if (!pos) return;

      if (activeTool === "pen") {
        if (currentPoints.length >= 4) {
          addElement({
            elementId: crypto.randomUUID(),
            type: "pen",
            data: {
              points: currentPoints,
              stroke: strokeColor,
              strokeWidth,
              opacity: 1,
            },
            createdBy: userId,
            updatedAt: Date.now(),
          });
        }
        setCurrentPoints([]);
      }

      if (activeTool === "rect" && startPos) {
        const x = Math.min(startPos.x, pos.x);
        const y = Math.min(startPos.y, pos.y);
        const w = Math.abs(pos.x - startPos.x);
        const h = Math.abs(pos.y - startPos.y);
        if (w > 4 && h > 4) {
          addElement({
            elementId: crypto.randomUUID(),
            type: "rect",
            data: {
              x,
              y,
              width: w,
              height: h,
              fill: fillColor,
              stroke: strokeColor,
              strokeWidth,
              opacity: 1,
            },
            createdBy: userId,
            updatedAt: Date.now(),
          });
        }
      }

      if (activeTool === "circle" && startPos) {
        const w = Math.abs(pos.x - startPos.x);
        const h = Math.abs(pos.y - startPos.y);
        if (w > 4 && h > 4) {
          addElement({
            elementId: crypto.randomUUID(),
            type: "circle",
            data: {
              x: startPos.x + (pos.x - startPos.x) / 2,
              y: startPos.y + (pos.y - startPos.y) / 2,
              width: w,
              height: h,
              fill: fillColor,
              stroke: strokeColor,
              strokeWidth,
              opacity: 1,
            },
            createdBy: userId,
            updatedAt: Date.now(),
          });
        }
      }

      if (activeTool === "arrow" && startPos) {
        const dx = pos.x - startPos.x;
        const dy = pos.y - startPos.y;
        if (Math.hypot(dx, dy) > 8) {
          addElement({
            elementId: crypto.randomUUID(),
            type: "arrow",
            data: {
              points: [startPos.x, startPos.y, pos.x, pos.y],
              stroke: strokeColor,
              strokeWidth,
              opacity: 1,
            },
            createdBy: userId,
            updatedAt: Date.now(),
          });
        }
      }

      setIsDrawing(false);
      setStartPos(null);
      setEndPos(null);
    },
    [
      isDrawing,
      activeTool,
      currentPoints,
      startPos,
      endPos,
      addElement,
      fillColor,
      strokeColor,
      strokeWidth,
      userId,
    ]
  );

  /* ─── text editor ─────────────────────────────────────────── */

  function openTextEditor(el: CanvasElement) {
    const stage = stageRef.current;
    if (!stage) return;
    const node = stage.findOne(`#${el.elementId}`);
    if (!node) return;
    const absPos = node.getAbsolutePosition();
    const containerRect = stage.container().getBoundingClientRect();
    const scale = stage.scaleX();
    setTextEditor({
      id: el.elementId,
      x: containerRect.left + absPos.x * scale,
      y: containerRect.top + absPos.y * scale,
      width: (el.data.width ?? 200) * scale,
      text: el.data.text ?? "",
      fontSize: (el.data.fontSize ?? 16) * scale,
    });
  }

  function commitTextEdit(text: string) {
    if (textEditor) {
      updateElement(textEditor.id, { text });
      setTextEditor(null);
    }
  }

  /* ─── element event factories ───────────────────────────────── */

  function makeSharedHandlers(el: CanvasElement) {
    return {
      id: el.elementId,
      draggable: activeTool === "select",
      onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
        e.cancelBubble = true;
        if (activeTool === "select") {
          setSelectedId(el.elementId);
        } else if (activeTool === "eraser") {
          deleteElement(el.elementId);
        }
      },
      onMouseEnter: (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (activeTool === "eraser") {
          (e.target as Konva.Shape).opacity(0.4);
          stageRef.current?.container().style.setProperty("cursor", "cell");
          (e.target as Konva.Shape).getLayer()?.batchDraw();
        }
      },
      onMouseLeave: (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (activeTool === "eraser") {
          (e.target as Konva.Shape).opacity(el.data.opacity ?? 1);
          (e.target as Konva.Shape).getLayer()?.batchDraw();
        }
      },
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
        updateElement(el.elementId, { x: e.target.x(), y: e.target.y() });
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
      const update: Partial<KonvaData> = {
        x: node.x(),
        y: node.y(),
        width: Math.max(8, (el.data.width ?? 100) * sx),
        height: Math.max(8, (el.data.height ?? 100) * sy),
        rotation: node.rotation(),
      };
      updateElement(el.elementId, update);
    };
  }

  /* ─── element renderer ─────────────────────────────────────── */

  function renderElement(el: CanvasElement) {
    const shared = makeSharedHandlers(el);
    const onTransformEnd = makeTransformEnd(el);
    const opacity = el.data.opacity ?? 1;

    switch (el.type) {
      case "pen":
        return (
          <Line
            key={el.elementId}
            {...shared}
            points={el.data.points ?? []}
            stroke={el.data.stroke ?? "#6C63FF"}
            strokeWidth={el.data.strokeWidth ?? 2}
            tension={0.5}
            lineCap="round"
            lineJoin="round"
            opacity={opacity}
          />
        );

      case "rect":
        return (
          <Rect
            key={el.elementId}
            {...shared}
            x={el.data.x ?? 0}
            y={el.data.y ?? 0}
            width={el.data.width ?? 100}
            height={el.data.height ?? 100}
            fill={el.data.fill === "transparent" ? undefined : el.data.fill}
            stroke={el.data.stroke ?? "#6C63FF"}
            strokeWidth={el.data.strokeWidth ?? 2}
            rotation={el.data.rotation ?? 0}
            opacity={opacity}
            onTransformEnd={onTransformEnd}
          />
        );

      case "circle": {
        const radius = Math.min(el.data.width ?? 100, el.data.height ?? 100) / 2;
        return (
          <KonvaCircle
            key={el.elementId}
            {...shared}
            x={el.data.x ?? 0}
            y={el.data.y ?? 0}
            radius={radius}
            fill={el.data.fill === "transparent" ? undefined : el.data.fill}
            stroke={el.data.stroke ?? "#6C63FF"}
            strokeWidth={el.data.strokeWidth ?? 2}
            rotation={el.data.rotation ?? 0}
            opacity={opacity}
            onTransformEnd={(e) => {
              const node = e.target as Konva.Circle;
              const sx = node.scaleX();
              node.scaleX(1);
              node.scaleY(1);
              updateElement(el.elementId, {
                x: node.x(),
                y: node.y(),
                width: Math.max(8, (el.data.width ?? 100) * sx),
                height: Math.max(8, (el.data.width ?? 100) * sx),
                rotation: node.rotation(),
              });
            }}
          />
        );
      }

      case "arrow":
        return (
          <Arrow
            key={el.elementId}
            {...shared}
            points={el.data.points ?? [0, 0, 100, 0]}
            stroke={el.data.stroke ?? "#6C63FF"}
            strokeWidth={el.data.strokeWidth ?? 2}
            fill={el.data.stroke ?? "#6C63FF"}
            pointerLength={10}
            pointerWidth={8}
            opacity={opacity}
          />
        );

      case "text":
        return (
          <Text
            key={el.elementId}
            {...shared}
            x={el.data.x ?? 0}
            y={el.data.y ?? 0}
            text={el.data.text ?? ""}
            fontSize={el.data.fontSize ?? 16}
            fill={el.data.fill ?? "#ffffff"}
            rotation={el.data.rotation ?? 0}
            opacity={opacity}
            onTransformEnd={onTransformEnd}
            onDblClick={() => openTextEditor(el)}
          />
        );

      case "sticky":
        return (
          <Group
            key={el.elementId}
            id={el.elementId}
            x={el.data.x ?? 0}
            y={el.data.y ?? 0}
            draggable={activeTool === "select"}
            opacity={opacity}
            onClick={(e: Konva.KonvaEventObject<MouseEvent>) => {
              e.cancelBubble = true;
              if (activeTool === "select") setSelectedId(el.elementId);
              else if (activeTool === "eraser") deleteElement(el.elementId);
            }}
            onMouseEnter={(e: Konva.KonvaEventObject<MouseEvent>) => {
              if (activeTool === "eraser") {
                (e.target as Konva.Shape).opacity(0.4);
                (e.target as Konva.Shape).getLayer()?.batchDraw();
              }
            }}
            onMouseLeave={(e: Konva.KonvaEventObject<MouseEvent>) => {
              if (activeTool === "eraser") {
                (e.target as Konva.Shape).opacity(1);
                (e.target as Konva.Shape).getLayer()?.batchDraw();
              }
            }}
            onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
              updateElement(el.elementId, { x: e.target.x(), y: e.target.y() });
            }}
            onTransformEnd={(e: Konva.KonvaEventObject<Event>) => {
              const node = e.target as Konva.Group;
              const sx = node.scaleX();
              const sy = node.scaleY();
              node.scaleX(1);
              node.scaleY(1);
              updateElement(el.elementId, {
                x: node.x(),
                y: node.y(),
                width: Math.max(60, (el.data.width ?? 160) * sx),
                height: Math.max(40, (el.data.height ?? 120) * sy),
                rotation: node.rotation(),
              });
            }}
            onDblClick={() => openTextEditor(el)}
          >
            <Rect
              width={el.data.width ?? 160}
              height={el.data.height ?? 120}
              fill={el.data.fill ?? "#FAC775"}
              cornerRadius={4}
              shadowBlur={6}
              shadowColor="rgba(0,0,0,0.25)"
              shadowOffsetY={2}
              listening={false}
            />
            <Text
              text={el.data.text ?? "New note"}
              fontSize={el.data.fontSize ?? 13}
              fill="#1a1a1a"
              padding={10}
              width={el.data.width ?? 160}
              wrap="word"
              listening={false}
            />
          </Group>
        );

      default:
        return null;
    }
  }

  /* ─── live preview shapes ───────────────────────────────────── */

  function renderLivePreview() {
    if (!isDrawing) return null;

    if (activeTool === "pen" && currentPoints.length >= 2) {
      return (
        <Line
          points={currentPoints}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          tension={0.5}
          lineCap="round"
          lineJoin="round"
          listening={false}
          opacity={0.85}
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
        <Rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill={fillColor === "transparent" ? undefined : fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          listening={false}
          opacity={0.75}
          dash={[4, 4]}
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
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          listening={false}
          opacity={0.75}
          dash={[4, 4]}
        />
      );
    }

    if (activeTool === "arrow") {
      return (
        <Arrow
          points={[startPos.x, startPos.y, endPos.x, endPos.y]}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill={strokeColor}
          pointerLength={10}
          pointerWidth={8}
          listening={false}
          opacity={0.75}
        />
      );
    }

    return null;
  }

  /* ─── render ───────────────────────────────────────────────── */

  if (dims.width === 0) return null;

  return (
    <div className="relative flex-1 overflow-hidden" style={{ background: "#0F1117" }}>
      <Stage
        ref={stageRef}
        width={dims.width}
        height={dims.height}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
      >
        {/* dot grid layer — non-interactive */}
        <Layer listening={false}>{dotGrid}</Layer>

        {/* main elements layer */}
        <Layer>
          {elements.map(renderElement)}
          {renderLivePreview()}
          <Transformer
            ref={transformerRef}
            rotateEnabled
            keepRatio={false}
            boundBoxFunc={(oldBox, newBox) =>
              newBox.width < 8 || newBox.height < 8 ? oldBox : newBox
            }
          />
        </Layer>
      </Stage>

      {/* floating textarea for text editing */}
      {textEditor && (
        <textarea
          autoFocus
          style={{
            position: "fixed",
            left: textEditor.x,
            top: textEditor.y,
            minWidth: Math.max(120, textEditor.width),
            fontSize: textEditor.fontSize,
            background: "rgba(22,25,32,0.95)",
            color: strokeColor,
            border: "1.5px solid #6C63FF",
            borderRadius: 4,
            padding: "4px 6px",
            outline: "none",
            resize: "none",
            zIndex: 50,
            lineHeight: 1.4,
            fontFamily: "inherit",
          }}
          defaultValue={textEditor.text}
          rows={3}
          onBlur={(e) => commitTextEdit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              commitTextEdit((e.target as HTMLTextAreaElement).value);
            }
            if (e.key === "Escape") {
              setTextEditor(null);
            }
          }}
        />
      )}
    </div>
  );
}
