"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  ArrowLeft, Share2, MoreHorizontal, Check, Pencil, Copy,
  Download, FileJson, Settings, Trash2, MousePointer2,
  Pen, Square, Circle, Type,
} from "lucide-react";
import { DropdownMenu, AlertDialog } from "radix-ui";
import type Konva from "konva";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/store/canvasStore";
import { updateBoard, deleteBoard } from "@/lib/api";
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
  onShareClick:() => void;
  stageRef:    React.RefObject<Konva.Stage | null>;
  onDelete:    () => void;
}

export function Topbar({ board, userId, onlineUsers, onShareClick, stageRef, onDelete }: TopbarProps) {
  const router           = useRouter();
  const { getToken }     = useAuth();
  const { activeTool, elements, setTool } = useCanvasStore();

  const [name, setName]         = useState(board.name);
  const [editing, setEditing]   = useState(false);
  const [inputVal, setInputVal] = useState(board.name);
  const [saved, setSaved]       = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  async function saveName() {
    const trimmed = inputVal.trim();
    if (!trimmed || trimmed === name) { setInputVal(name); setEditing(false); return; }
    const token = await getToken();
    if (!token) return;
    try {
      const updated = await updateBoard(board.id, trimmed, token);
      setName(updated.name); setInputVal(updated.name);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
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

  const menuItem = cn(
    "flex items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 text-[13px] outline-none cursor-pointer transition-colors",
    "text-white/70 hover:bg-white/6 hover:text-white focus:bg-white/6 focus:text-white"
  );

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 flex h-14 items-center justify-between px-4 gap-3 z-40"
        style={{
          background: "rgba(22,25,32,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "0.5px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* ── LEFT ─────────────────────────────────── */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            title="Back to dashboard"
            onClick={() => router.push("/dashboard")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/50 hover:text-white transition-all active:scale-95"
            style={{ background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.08)" }}
          >
            <ArrowLeft size={16} />
          </button>

          <span className="text-white/25 text-sm mx-0.5">/</span>

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
              className="max-w-[180px] truncate rounded-md bg-white/6 px-2 py-0.5 text-sm font-medium text-white outline-none"
              style={{ outline: "1.5px solid #6C63FF" }}
            />
          ) : (
            <button
              onClick={() => { setEditing(true); setInputVal(name); }}
              className="flex items-center gap-1.5 max-w-[180px] truncate rounded-md px-2 py-0.5 text-sm font-medium text-[#E8E6DE] hover:bg-white/6 transition-colors"
              title="Click to rename"
            >
              <span className="truncate">{name}</span>
              {saved && <Check size={12} style={{ color: "#5DCAA5", flexShrink: 0 }} />}
            </button>
          )}

          {/* live pill */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: isLive ? "#5DCAA5" : "rgba(255,255,255,0.25)" }}
            />
            <span className="text-[11px]" style={{ color: isLive ? "#5DCAA5" : "rgba(255,255,255,0.30)" }}>
              {isLive ? "Live" : "Solo"}
            </span>
          </div>
        </div>

        {/* ── CENTER — quick tool pills ─────────────── */}
        <div
          className="hidden md:flex items-center gap-px rounded-[10px] p-[3px]"
          style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" }}
        >
          {TOP_TOOLS.map(({ type, icon, shortcut }) => (
            <button
              key={type}
              title={`${type.charAt(0).toUpperCase() + type.slice(1)} (${shortcut})`}
              onClick={() => setTool(type)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-[7px] transition-all duration-100 active:scale-95",
                activeTool === type
                  ? "bg-[#6C63FF] text-white"
                  : "text-white/40 hover:bg-white/6 hover:text-white/70"
              )}
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
                    border: "2px solid #161920",
                    marginLeft: i === 0 ? 0 : -8,
                    zIndex: visibleUsers.length - i,
                  }}
                >
                  {initials(uid)}
                </div>
              ))}
              {extra > 0 && (
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold"
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.6)",
                    border: "2px solid #161920",
                    marginLeft: -8,
                  }}
                >
                  +{extra}
                </div>
              )}
            </div>
          )}

          <div className="h-5 w-px" style={{ background: "rgba(255,255,255,0.1)" }} />

          {/* share */}
          <button
            onClick={onShareClick}
            className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-white transition-all active:scale-95"
            style={{ background: "#6C63FF" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#7C74FF"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#6C63FF"; }}
          >
            <Share2 size={14} />
            Share
          </button>

          {/* more menu */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                title="More options"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/6 transition-all active:scale-95"
              >
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="z-50 min-w-[180px] rounded-[10px] p-1 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                style={{ background: "#1E2028", border: "0.5px solid rgba(255,255,255,0.08)" }}
                sideOffset={4}
                align="end"
              >
                <DropdownMenu.Item className={menuItem} onSelect={() => { setEditing(true); setInputVal(name); }}>
                  <Pencil size={14} className="text-white/40" /> Rename board
                </DropdownMenu.Item>
                <DropdownMenu.Item className={menuItem} onSelect={() => {}}>
                  <Copy size={14} className="text-white/40" /> Duplicate board
                </DropdownMenu.Item>
                <DropdownMenu.Item className={menuItem} onSelect={exportPng}>
                  <Download size={14} className="text-white/40" /> Export as PNG
                </DropdownMenu.Item>
                <DropdownMenu.Item className={menuItem} onSelect={exportJson}>
                  <FileJson size={14} className="text-white/40" /> Export as JSON
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                <DropdownMenu.Item className={menuItem} onSelect={() => {}}>
                  <Settings size={14} className="text-white/40" /> Board settings
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
                <DropdownMenu.Item
                  className={cn(menuItem, "text-[#F87171] hover:text-[#F87171] focus:text-[#F87171]")}
                  onSelect={() => setDeleteOpen(true)}
                >
                  <Trash2 size={14} style={{ color: "#F87171" }} /> Delete board
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
          <AlertDialog.Content
            className="fixed left-1/2 top-1/2 z-[60] -translate-x-1/2 -translate-y-1/2 w-[360px] max-w-[calc(100vw-32px)] rounded-2xl p-6 shadow-2xl"
            style={{ background: "#1E2028", border: "0.5px solid rgba(255,255,255,0.08)" }}
          >
            <AlertDialog.Title className="text-base font-semibold text-white mb-2">
              Delete board?
            </AlertDialog.Title>
            <AlertDialog.Description className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>
              This will permanently delete <strong className="text-white/80">{name}</strong> and all its elements.
              This action cannot be undone.
            </AlertDialog.Description>
            <div className="flex justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <button
                  className="h-9 rounded-lg px-4 text-sm text-white/60 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  Cancel
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  onClick={() => void handleDelete()}
                  className="h-9 rounded-lg px-4 text-sm font-medium text-white transition-all active:scale-95"
                  style={{ background: "#F87171" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#EF4444"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#F87171"; }}
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
