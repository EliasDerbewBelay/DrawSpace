"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { LayoutTemplate, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  isOpen:    boolean;
  onClose:   () => void;
  onCreate:  (name: string) => Promise<void>;
}

export function CreateBoardModal({ isOpen, onClose, onCreate }: Props) {
  const [name, setName]       = useState("");
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setError(null);
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await onCreate(name.trim() || "Untitled Board");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create board");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open && !loading) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[60] w-full max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 outline-none"
          style={{ maxWidth: 440 }}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="overflow-hidden rounded-2xl shadow-2xl"
            style={{
              background: "#1E2028",
              border: "0.5px solid rgba(255,255,255,0.08)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
            }}
          >
            {/* header accent */}
            <div
              className="flex items-center gap-3 px-6 pt-6 pb-4"
              style={{ borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "rgba(108,99,255,0.15)" }}
              >
                <LayoutTemplate size={18} style={{ color: "#6C63FF" }} />
              </div>
              <div>
                <Dialog.Title className="text-[17px] font-medium text-white">
                  Create a new board
                </Dialog.Title>
                <Dialog.Description
                  className="mt-0.5 text-[13px]"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  Give your whiteboard a name to get started.
                </Dialog.Description>
              </div>
            </div>

            <div className="px-6 py-5">
              <label
                htmlFor="board-name"
                className="mb-2 block text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                Board name
              </label>
              <input
                id="board-name"
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Product brainstorm, Sprint planning…"
                disabled={loading}
                className="w-full rounded-lg px-3.5 py-2.5 text-[14px] text-white outline-none transition-all disabled:opacity-50"
                style={{
                  background: "#0F1117",
                  border: "0.5px solid rgba(255,255,255,0.10)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#6C63FF";
                  e.currentTarget.style.boxShadow = "0 0 0 2px rgba(108,99,255,0.2)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && !loading) onClose();
                }}
              />
              {error && (
                <p className="mt-2 text-[12px]" style={{ color: "#F87171" }}>
                  {error}
                </p>
              )}
            </div>

            <div
              className="flex items-center justify-end gap-2 px-6 py-4"
              style={{
                background: "rgba(255,255,255,0.02)",
                borderTop: "0.5px solid rgba(255,255,255,0.07)",
              }}
            >
              <button
                type="button"
                disabled={loading}
                onClick={onClose}
                className="h-9 rounded-lg px-4 text-[13px] transition-colors disabled:opacity-40"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-lg px-5 text-[13px] font-medium text-white transition-all active:scale-[0.98] disabled:opacity-60"
                )}
                style={{ background: "#6C63FF" }}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Creating…
                  </>
                ) : (
                  "Create board"
                )}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
