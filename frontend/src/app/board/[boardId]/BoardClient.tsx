"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import type Konva from "konva";
import { ArrowLeft, Copy, Check, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateBoard } from "@/lib/api";
import socket, { connectSocket, disconnectSocket } from "@/lib/socket";
import type { Board, BoardMember } from "@/types/board";
import { Toolbar } from "@/components/canvas/Toolbar";
import { RightPanel } from "@/components/canvas/RightPanel";
import { BottomBar } from "@/components/canvas/BottomBar";

const WhiteboardCanvas = dynamic(
  () => import("@/components/canvas/WhiteboardCanvas"),
  { ssr: false }
);

/* ─── helpers ─────────────────────────────────────────────── */

function initials(userId: string): string {
  const stripped = userId.replace(/^user_/, "");
  return stripped.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-violet-500",
  "bg-sky-500",
  "bg-emerald-500",
  "bg-orange-500",
  "bg-pink-500",
];

function colorFor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) & 0xffffffff;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/* ─── component ───────────────────────────────────────────── */

interface Props {
  board: Board & { members: BoardMember[] };
  userId: string;
}

const MAX_AVATARS = 4;

export default function BoardClient({ board: initialBoard, userId }: Props) {
  const router = useRouter();
  const { getToken } = useAuth();

  const [boardName, setBoardName] = useState(initialBoard.name);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(initialBoard.name);
  const [onlineCount, setOnlineCount] = useState(0);
  const [copied, setCopied] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<Konva.Stage | null>(null);

  const allMembers = initialBoard.members;
  const visibleMembers = allMembers.slice(0, MAX_AVATARS);
  const extraCount = Math.max(0, allMembers.length - MAX_AVATARS);

  /* socket lifecycle */
  useEffect(() => {
    let active = true;
    async function connect() {
      const token = await getToken();
      if (!token || !active) return;
      connectSocket(token);
      socket.emit("board:join", initialBoard.id);
    }
    void connect();

    socket.on("room:users", (socketIds) => {
      setOnlineCount(socketIds.length);
    });

    return () => {
      active = false;
      socket.emit("board:leave", initialBoard.id);
      socket.off("room:users");
      disconnectSocket();
    };
  }, [getToken, initialBoard.id]);

  /* focus name input when editing */
  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  async function saveName() {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === boardName) {
      setNameInput(boardName);
      setEditingName(false);
      return;
    }
    const token = await getToken();
    if (!token) return;
    try {
      const updated = await updateBoard(initialBoard.id, trimmed, token);
      setBoardName(updated.name);
      setNameInput(updated.name);
    } catch {
      setNameInput(boardName);
    }
    setEditingName(false);
  }

  function handleShare() {
    void navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0F1117]">
      {/* ─── topbar ─── */}
      <header
        className="flex h-14 shrink-0 items-center justify-between border-b px-4 z-10"
        style={{ borderColor: "rgba(255,255,255,0.07)", background: "#0F1117" }}
      >
        {/* left */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/50 hover:bg-white/8 hover:text-white transition-colors"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={15} />
          </button>

          {editingName ? (
            <input
              ref={nameInputRef}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={() => void saveName()}
              onKeyDown={(e) => {
                if (e.key === "Enter") void saveName();
                if (e.key === "Escape") {
                  setNameInput(boardName);
                  setEditingName(false);
                }
              }}
              className="rounded bg-white/8 px-2 py-0.5 text-sm font-medium text-white outline-none ring-1 ring-violet-500"
            />
          ) : (
            <button
              onClick={() => {
                setEditingName(true);
                setNameInput(boardName);
              }}
              className="rounded px-1.5 py-0.5 text-sm font-medium text-white hover:bg-white/8 transition-colors"
            >
              {boardName}
            </button>
          )}
        </div>

        {/* right */}
        <div className="flex items-center gap-3">
          {onlineCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-white/40">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {onlineCount} online
            </div>
          )}

          <div className="flex items-center -space-x-1.5">
            {visibleMembers.map((member) => (
              <div
                key={member.id}
                title={member.userId}
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white ring-1 ring-[#0F1117] ${colorFor(member.userId)}`}
              >
                {initials(member.userId)}
              </div>
            ))}
            {extraCount > 0 && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[9px] font-bold text-white/60 ring-1 ring-[#0F1117]">
                +{extraCount}
              </div>
            )}
            {allMembers.length === 0 && (
              <div className="flex items-center gap-1 text-xs text-white/30">
                <Users size={12} />
              </div>
            )}
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleShare}
            className="h-7 gap-1.5 text-xs text-white/60 hover:bg-white/8 hover:text-white"
          >
            {copied ? (
              <Check size={12} className="text-emerald-400" />
            ) : (
              <Copy size={12} />
            )}
            {copied ? "Copied!" : "Share"}
          </Button>
        </div>
      </header>

      {/* ─── main canvas area ─── */}
      <div className="flex flex-1 overflow-hidden">
        <Toolbar />

        {/* canvas occupies remaining space after 44px toolbar (positioned fixed) */}
        <div className="flex-1 overflow-hidden" style={{ marginLeft: 44 }}>
          <WhiteboardCanvas
            boardId={initialBoard.id}
            userId={userId}
            stageRef={stageRef}
          />
        </div>

        <RightPanel />
      </div>

      <BottomBar stageRef={stageRef} />
    </div>
  );
}
