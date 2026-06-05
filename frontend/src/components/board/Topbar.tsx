"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  ArrowLeft, Share2, MoreHorizontal, Check, Pencil, Copy,
  Download, FileJson, Settings, Trash2, MousePointer2,
  Pen, Square, Circle, Type, Save, Loader2,
} from "lucide-react";
import { DropdownMenu, AlertDialog } from "radix-ui";
import type Konva from "konva";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { boardIconBtn, boardMenuItem, boardToolBtn } from "@/lib/board-ui";
import { useCanvasStore } from "@/store/canvasStore";
import { updateBoard, deleteBoard, saveBoard } from "@/lib/api";
import type { Board, BoardMember } from "@/types/board";
import type { ToolType } from "@/types/canvas";

/* ─── helpers ─────────────────────────────────────────────────── */

const AVATAR_COLORS = ["#6C63FF", "#3ECFCF", "#F0997B", "#FAC775", "#97C459", "#D4537E"];

function colorForUser(uid: string): string {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(uid: string): string {
  return uid.replace(/^user_/, "").slice(0, 2).toUpperCase();
}

const TOP_TOOLS: { type: ToolType; icon: React.ReactNode; shortcut: string }[] = [
  { type: "select", icon: <MousePointer2 size={14} />, shortcut: "V" },
  { type: "pen",    icon: <Pen size={14} />,           shortcut: "P" },
  { type: "rect",   icon: <Square size={14} />,        shortcut: "R" },
  { type: "circle", icon: <Circle size={14} />,        shortcut: "C" },
  { type: "text",   icon: <Type size={14} />,          shortcut: "T" },
];

/* ─── component ───────────────────────────────────────────────── */

interface TopbarProps {
  board:       Board & { members: BoardMember[] };
  userId:      string;
  onlineUsers: string[];
  onShareClick:    () => void;
  onSettingsClick: () => void;
  onBoardSaved?:   (savedAt: string) => void;
  stageRef:    React.RefObject<Konva.Stage | null>;
  onDelete:    () => void;
}

export function Topbar({ board, userId, onlineUsers, onShareClick, onSettingsClick, onBoardSaved, stageRef, onDelete }: TopbarProps) {
  const router           = useRouter();
  const { getToken }     = useAuth();
  const { activeTool, elements, setTool } = useCanvasStore();

  const [name, setName]         = useState(board.name);
  const [editing, setEditing]   = useState(false);
  const [inputVal, setInputVal] = useState(board.name);
  const [nameSaved, setNameSaved]   = useState(false);
  const [saveState, setSaveState]   = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { setName(board.name); setInputVal(board.name); }, [board.name]);

  const handleSaveBoard = useCallback(async () => {
    if (saveState === "saving") return;
    const token = await getToken();
    if (!token) return;
    setSaveState("saving");
    try {
      const { savedAt } = await saveBoard(board.id, elements, token);
      setSaveState("saved");
      onBoardSaved?.(savedAt);
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }, [saveState, getToken, board.id, elements, onBoardSaved]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        void handleSaveBoard();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSaveBoard]);

  async function saveName() {
    const trimmed = inputVal.trim();
    if (!trimmed || trimmed === name) { setInputVal(name); setEditing(false); return; }
    const token = await getToken();
    if (!token) return;
    try {
      const updated = await updateBoard(board.id, trimmed, token);
      setName(updated.name); setInputVal(updated.name);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 1500);
    } catch { setInputVal(name); }
    setEditing(false);
  }

  async function handleDelete() {
    const token = await getToken();
    if (!token) return;
    try { await deleteBoard(board.id, token); } catch { /* ignore */ }
    onDelete();
    router.push("/dashboard");
  }

  function exportPng() {
    const stage = stageRef.current;
    if (!stage) return;
    const a = document.createElement("a");
    a.href = stage.toDataURL({ pixelRatio: 2 });
    a.download = `drawspace-${name}-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(elements, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `drawspace-${name}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }

  const isLive = onlineUsers.length > 1;
  const visibleUsers = onlineUsers.slice(0, 3);
  const extra = Math.max(0, onlineUsers.length - 3);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border bg-card/90 px-4 backdrop-blur-md">
        {/* ── LEFT ─────────────────────────────────── */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            title="Back to dashboard"
            onClick={() => router.push("/dashboard")}
            className={cn(boardIconBtn, "h-8 w-8 shrink-0")}
          >
            <ArrowLeft size={16} />
          </button>

          <span className="mx-0.5 text-sm text-muted-foreground/50">/</span>

          {editing ? (
            <input
              ref={inputRef}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onBlur={() => void saveName()}
              onKeyDown={(e) => {
                if (e.key === "Enter") void saveName();
                if (e.key === "Escape") { setInputVal(name); setEditing(false); }
              }}
              className="max-w-[180px] truncate rounded-md border border-primary bg-muted px-2 py-0.5 text-sm font-medium text-foreground outline-none ring-2 ring-primary/30"
            />
          ) : (
            <button
              onClick={() => { setEditing(true); setInputVal(name); }}
              className="flex max-w-[180px] items-center gap-1.5 truncate rounded-md px-2 py-0.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              title="Click to rename"
            >
              <span className="truncate">{name}</span>
              {nameSaved && <Check size={12} className="shrink-0 text-[var(--success)]" />}
            </button>
          )}

          {/* live pill */}
          <div className="hidden items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2 py-0.5 sm:flex">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: isLive ? "var(--success)" : "var(--muted-foreground)" }}
            />
            <span className="text-[11px]" style={{ color: isLive ? "var(--success)" : undefined }}>
              {isLive ? "Live" : "Solo"}
            </span>
          </div>
        </div>

        {/* ── CENTER — quick tool pills ─────────────── */}
        <div className="hidden items-center gap-px rounded-[10px] border border-border bg-muted/50 p-[3px] md:flex">
          {TOP_TOOLS.map(({ type, icon, shortcut }) => (
            <button
              key={type}
              title={`${type.charAt(0).toUpperCase() + type.slice(1)} (${shortcut})`}
              onClick={() => setTool(type)}
              className={boardToolBtn(activeTool === type)}
            >
              {icon}
            </button>
          ))}
        </div>

        {/* ── RIGHT ─────────────────────────────────── */}
        <div className="flex items-center gap-2.5">
          {/* member avatars */}
          {visibleUsers.length > 0 && (
            <div className="hidden sm:flex items-center">
              {visibleUsers.map((uid, i) => (
                <div
                  key={uid}
                  title={uid === userId ? "You" : uid.replace(/^user_/, "").slice(0, 8)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{
                    background: colorForUser(uid),
                    border: "2px solid var(--card)",
                    marginLeft: i === 0 ? 0 : -8,
                    zIndex: visibleUsers.length - i,
                  }}
                >
                  {initials(uid)}
                </div>
              ))}
              {extra > 0 && (
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-bold text-muted-foreground"
                  style={{ marginLeft: -8 }}
                >
                  +{extra}
                </div>
              )}
            </div>
          )}

          <div className="h-5 w-px bg-border" />

          <ThemeToggle />

          <button
            onClick={() => void handleSaveBoard()}
            disabled={saveState === "saving"}
            title="Save board (⌘S)"
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-all active:scale-95 disabled:opacity-60",
              saveState === "saved"
                ? "border-[var(--success)]/40 bg-[var(--success)]/10 text-[var(--success)]"
                : saveState === "error"
                  ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : "border-border bg-muted/50 text-foreground hover:bg-muted"
            )}
          >
            {saveState === "saving" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : saveState === "saved" ? (
              <Check size={14} />
            ) : (
              <Save size={14} />
            )}
            {saveState === "saving"
              ? "Saving…"
              : saveState === "saved"
                ? "Saved"
                : "Save"}
          </button>

          <button
            onClick={onShareClick}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-95"
          >
            <Share2 size={14} />
            Share
          </button>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                title="More options"
                className={cn(boardIconBtn, "h-8 w-8 border-0")}
              >
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="z-50 min-w-[180px] rounded-[10px] border border-border bg-popover p-1 text-popover-foreground shadow-xl"
                sideOffset={4}
                align="end"
              >
                <DropdownMenu.Item className={boardMenuItem} onSelect={() => { setEditing(true); setInputVal(name); }}>
                  <Pencil size={14} className="text-muted-foreground" /> Rename board
                </DropdownMenu.Item>
                <DropdownMenu.Item className={boardMenuItem} onSelect={() => {}}>
                  <Copy size={14} className="text-muted-foreground" /> Duplicate board
                </DropdownMenu.Item>
                <DropdownMenu.Item className={boardMenuItem} onSelect={exportPng}>
                  <Download size={14} className="text-muted-foreground" /> Export as PNG
                </DropdownMenu.Item>
                <DropdownMenu.Item className={boardMenuItem} onSelect={exportJson}>
                  <FileJson size={14} className="text-muted-foreground" /> Export as JSON
                </DropdownMenu.Item>
                <DropdownMenu.Item className={boardMenuItem} onSelect={() => void handleSaveBoard()}>
                  <Save size={14} className="text-muted-foreground" /> Save board
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-border" />
                <DropdownMenu.Item className={boardMenuItem} onSelect={onSettingsClick}>
                  <Settings size={14} className="text-muted-foreground" /> Board settings
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-border" />
                <DropdownMenu.Item
                  className={cn(boardMenuItem, "text-destructive hover:text-destructive focus:text-destructive")}
                  onSelect={() => setDeleteOpen(true)}
                >
                  <Trash2 size={14} className="text-destructive" /> Delete board
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </header>

      {/* ── Delete confirmation AlertDialog ─────── */}
      <AlertDialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[60] w-[360px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-popover p-6 text-popover-foreground shadow-2xl">
            <AlertDialog.Title className="mb-2 text-base font-semibold text-foreground">
              Delete board?
            </AlertDialog.Title>
            <AlertDialog.Description className="mb-6 text-sm text-muted-foreground">
              This will permanently delete <strong className="text-foreground">{name}</strong> and all its elements.
              This action cannot be undone.
            </AlertDialog.Description>
            <div className="flex justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <button className="h-9 rounded-lg bg-muted px-4 text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Cancel
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  onClick={() => void handleDelete()}
                  className="h-9 rounded-lg bg-destructive px-4 text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
                >
                  Delete board
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
