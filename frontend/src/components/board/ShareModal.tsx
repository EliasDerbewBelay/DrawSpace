"use client";

import { useState, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { Dialog } from "radix-ui";
import type { Board, BoardMember } from "@/types/board";

interface Props {
  board:    Board & { members: BoardMember[] };
  userId:   string;
  isOpen:   boolean;
  onClose:  () => void;
}

const AVATAR_COLORS = ["#6C63FF", "#3ECFCF", "#F0997B", "#FAC775", "#97C459", "#D4537E"];

function colorForUser(uid: string): string {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(uid: string): string {
  return uid.replace(/^user_/, "").slice(0, 2).toUpperCase();
}

export function ShareModal({ board, userId, isOpen, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => { setUrl(window.location.href); }, []);

  function copyLink() {
    const showCopied = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(url).then(showCopied).catch(() => {
        fallbackCopy(url);
        showCopied();
      });
      return;
    }

    fallbackCopy(url);
    showCopied();
  }

  function fallbackCopy(text: string) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }

  const members = board.members ?? [];

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[60] -translate-x-1/2 -translate-y-1/2 max-w-[calc(100vw-32px)] outline-none"
          style={{
            width: 420,
            background: "#1E2028",
            border: "0.5px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          }}
        >
          {/* Header */}
          <Dialog.Title className="text-[18px] font-medium text-white">
            Share board
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-[13px]" style={{ color: "rgba(255,255,255,0.45)" }}>
            Anyone with the link can join and edit.
          </Dialog.Description>

          {/* Link */}
          <div className="mt-6">
            <span className="block text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.40)" }}>
              Board link
            </span>
            <div className="flex gap-2">
              <input
                readOnly
                value={url}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="flex-1 rounded-lg px-3 py-2 text-[13px] outline-none cursor-text"
                style={{
                  background: "#0F1117",
                  border: "0.5px solid rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.70)",
                }}
              />
              <button
                onClick={copyLink}
                title="Copy link"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all active:scale-95"
                style={{ background: "#6C63FF" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#7C74FF"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#6C63FF"; }}
              >
                {copied
                  ? <Check size={14} style={{ color: "#5DCAA5" }} />
                  : <Copy size={14} className="text-white" />
                }
              </button>
            </div>
          </div>

          {/* Members */}
          {members.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.40)" }}>
                  Members
                </span>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px]"
                  style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.40)" }}
                >
                  {members.length}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
                {members.map((m) => {
                  const isOwner  = m.userId === board.ownerId;
                  const isYou    = m.userId === userId;
                  const displayName = m.userId.replace(/^user_/, "").slice(0, 12);
                  return (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/4">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                        style={{ background: colorForUser(m.userId) }}
                      >
                        {initials(m.userId)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] text-white/80 truncate">
                          {displayName}{isYou ? " (you)" : ""}
                        </p>
                        <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                          {isOwner ? "Owner" : "Editor"}
                        </p>
                      </div>
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0"
                        style={{
                          background: isOwner ? "rgba(108,99,255,0.2)" : "rgba(255,255,255,0.06)",
                          color:      isOwner ? "#A09AFF"             : "rgba(255,255,255,0.50)",
                        }}
                      >
                        {isOwner ? "Owner" : "Editor"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px]" style={{ color: "rgba(255,255,255,0.40)" }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#5DCAA5" }} />
              Link sharing is on
            </div>
            <button
              onClick={onClose}
              className="h-9 rounded-lg px-5 text-[13px] font-medium text-white transition-all active:scale-95"
              style={{ background: "#6C63FF" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#7C74FF"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#6C63FF"; }}
            >
              Done
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
