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
          className="fixed left-1/2 top-1/2 z-[60] w-[420px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-popover p-6 text-popover-foreground shadow-2xl outline-none"
        >
          <Dialog.Title className="text-[18px] font-medium text-foreground">
            Share board
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-[13px] text-muted-foreground">
            Anyone with the link can join and edit.
          </Dialog.Description>

          <div className="mt-6">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Board link
            </span>
            <div className="flex gap-2">
              <input
                readOnly
                value={url}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="flex-1 cursor-text rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none"
              />
              <button
                onClick={copyLink}
                title="Copy link"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:opacity-90 active:scale-95"
              >
                {copied
                  ? <Check size={14} className="text-[var(--success)]" />
                  : <Copy size={14} />
                }
              </button>
            </div>
          </div>

          {members.length > 0 && (
            <div className="mt-6">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Members
                </span>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {members.length}
                </span>
              </div>
              <div className="flex max-h-[200px] flex-col gap-0.5 overflow-y-auto">
                {members.map((m) => {
                  const isOwner  = m.userId === board.ownerId;
                  const isYou    = m.userId === userId;
                  const displayName = m.userId.replace(/^user_/, "").slice(0, 12);
                  return (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/50">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                        style={{ background: colorForUser(m.userId) }}
                      >
                        {initials(m.userId)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] text-foreground">
                          {displayName}{isYou ? " (you)" : ""}
                        </p>
                        <p className="text-[12px] text-muted-foreground">
                          {isOwner ? "Owner" : "Editor"}
                        </p>
                      </div>
                      <span
                        className={
                          isOwner
                            ? "shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary"
                            : "shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                        }
                      >
                        {isOwner ? "Owner" : "Editor"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
              Link sharing is on
            </div>
            <button
              onClick={onClose}
              className="h-9 rounded-lg bg-primary px-5 text-[13px] font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-95"
            >
              Done
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
