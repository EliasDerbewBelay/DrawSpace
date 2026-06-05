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
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[60] w-full max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 outline-none"
          style={{ maxWidth: 440 }}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-border px-6 pb-4 pt-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                <LayoutTemplate size={18} className="text-primary" />
              </div>
              <div>
                <Dialog.Title className="text-[17px] font-medium text-foreground">
                  Create a new board
                </Dialog.Title>
                <Dialog.Description className="mt-0.5 text-[13px] text-muted-foreground">
                  Give your whiteboard a name to get started.
                </Dialog.Description>
              </div>
            </div>

            <div className="px-6 py-5">
              <label
                htmlFor="board-name"
                className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
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
                className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-[14px] text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/25 disabled:opacity-50"
                onKeyDown={(e) => {
                  if (e.key === "Escape" && !loading) onClose();
                }}
              />
              {error && (
                <p className="mt-2 text-[12px] text-destructive">{error}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
              <button
                type="button"
                disabled={loading}
                onClick={onClose}
                className="h-9 rounded-lg px-4 text-[13px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-lg bg-primary px-5 text-[13px] font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                )}
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
