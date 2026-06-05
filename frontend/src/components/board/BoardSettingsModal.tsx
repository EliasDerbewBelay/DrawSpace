"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Copy, Check, Share2, Grid3x3, Pencil } from "lucide-react";
import { Dialog } from "radix-ui";
import { cn } from "@/lib/utils";
import { patchBoard } from "@/lib/api";
import type { Board, BoardMember } from "@/types/board";
import {
  type BoardSettings,
  type CanvasBackgroundPreset,
  DEFAULT_BOARD_SETTINGS,
  normalizeBoardSettings,
} from "@/types/boardSettings";

const STROKE_PRESETS = [
  "#6C63FF", "#3ECFCF", "#F0997B", "#FAC775",
  "#97C459", "#D4537E", "#F1F0E8", "rgba(128,128,128,0.35)",
];

const FILL_PRESETS = [
  "transparent", "#6C63FF", "#3ECFCF", "#F0997B",
  "#FAC775", "#97C459", "#D4537E", "#F1F0E8",
];

const WIDTHS = [
  { label: "S", value: 2 },
  { label: "M", value: 4 },
  { label: "L", value: 8 },
] as const;

const BG_PRESETS: { id: CanvasBackgroundPreset; label: string; color: string }[] = [
  { id: "theme",     label: "Theme",     color: "var(--canvas-bg)" },
  { id: "#ffffff",   label: "White",     color: "#ffffff" },
  { id: "#f4f4f8",   label: "Light gray", color: "#f4f4f8" },
  { id: "#0F1117",   label: "Dark",      color: "#0F1117" },
  { id: "#1a1d26",   label: "Charcoal",  color: "#1a1d26" },
  { id: "custom",    label: "Custom",    color: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" },
];

const sectionLabel =
  "mb-2.5 block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground";

interface Props {
  board:       Board & { members: BoardMember[] };
  userId:      string;
  isOpen:      boolean;
  onClose:     () => void;
  onSaved:     (board: Board & { members: BoardMember[] }) => void;
  onShareClick: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function BoardSettingsModal({
  board,
  userId,
  isOpen,
  onClose,
  onSaved,
  onShareClick,
}: Props) {
  const { getToken } = useAuth();
  const isOwner = board.ownerId === userId;

  const [name, setName]           = useState(board.name);
  const [settings, setSettings]   = useState<BoardSettings>(() =>
    normalizeBoardSettings(board.settings)
  );
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [copiedId, setCopiedId]   = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(board.name);
    setSettings(normalizeBoardSettings(board.settings));
    setError(null);
  }, [isOpen, board.name, board.settings]);

  function updateSettings(patch: Partial<BoardSettings>) {
    setSettings((prev) => ({ ...prev, ...patch }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const token = await getToken();
    if (!token) {
      setSaving(false);
      return;
    }

    const payload: { name?: string; settings: Partial<BoardSettings> } = {
      settings,
    };
    const trimmedName = name.trim();
    if (isOwner && trimmedName && trimmedName !== board.name) {
      payload.name = trimmedName;
    }

    try {
      const updated = await patchBoard(board.id, payload, token);
      onSaved({
        ...board,
        ...updated,
        members: board.members,
        elements: board.elements,
        settings: normalizeBoardSettings(updated.settings),
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function copyBoardId() {
    const showCopied = () => {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    };
    void navigator.clipboard?.writeText(board.id).then(showCopied).catch(showCopied);
  }

  const elementCount = board.elements?.length ?? 0;
  const memberCount  = board._count?.members ?? board.members?.length ?? 0;
  const customColor  =
    settings.customBackgroundColor ?? DEFAULT_BOARD_SETTINGS.defaultStrokeColor;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[60] flex max-h-[min(90vh,720px)] w-[480px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl outline-none"
        >
          <div className="shrink-0 border-b border-border px-6 py-5">
            <Dialog.Title className="text-[18px] font-medium text-foreground">
              Board settings
            </Dialog.Title>
            <Dialog.Description className="mt-1 text-[13px] text-muted-foreground">
              Configure this board&apos;s appearance and drawing defaults.
            </Dialog.Description>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {/* General */}
            <section className="mb-6">
              <span className={sectionLabel}>General</span>

              <label className="mb-3 block">
                <span className="mb-1.5 block text-[13px] text-muted-foreground">Board name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isOwner}
                  placeholder="Untitled Board"
                  className={cn(
                    "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors",
                    "focus:border-primary focus:ring-2 focus:ring-primary/20",
                    !isOwner && "cursor-not-allowed opacity-60"
                  )}
                />
                {!isOwner && (
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    Only the board owner can rename this board.
                  </span>
                )}
              </label>

              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                  <span className="block text-[11px] text-muted-foreground">Elements</span>
                  <span className="font-medium text-foreground">{elementCount}</span>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                  <span className="block text-[11px] text-muted-foreground">Members</span>
                  <span className="font-medium text-foreground">{memberCount}</span>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                  <span className="block text-[11px] text-muted-foreground">Created</span>
                  <span className="font-medium text-foreground">{formatDate(board.createdAt)}</span>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                  <span className="block text-[11px] text-muted-foreground">Updated</span>
                  <span className="font-medium text-foreground">{formatDate(board.updatedAt)}</span>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-muted/40 px-3 py-2 text-[12px] text-muted-foreground">
                  {board.id}
                </code>
                <button
                  type="button"
                  onClick={copyBoardId}
                  title="Copy board ID"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {copiedId ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
                </button>
              </div>
            </section>

            {/* Canvas */}
            <section className="mb-6">
              <div className="mb-2.5 flex items-center gap-1.5">
                <Grid3x3 size={13} className="text-muted-foreground" />
                <span className={cn(sectionLabel, "mb-0")}>Canvas</span>
              </div>

              <span className="mb-2 block text-[13px] text-muted-foreground">Background</span>
              <div className="mb-3 grid grid-cols-3 gap-2">
                {BG_PRESETS.map(({ id, label, color }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => updateSettings({ canvasBackground: id })}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 transition-colors",
                      settings.canvasBackground === id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/30 hover:bg-muted/60"
                    )}
                  >
                    <span
                      className="h-6 w-full rounded-md border border-border"
                      style={{ background: color }}
                    />
                    <span className="text-[11px] text-foreground">{label}</span>
                  </button>
                ))}
              </div>

              {settings.canvasBackground === "custom" && (
                <div className="mb-3">
                  <span className="mb-1.5 block text-[13px] text-muted-foreground">Custom color</span>
                  <input
                    type="color"
                    value={customColor.startsWith("#") ? customColor : "#6C63FF"}
                    onChange={(e) =>
                      updateSettings({ customBackgroundColor: e.target.value })
                    }
                    className="h-9 w-full cursor-pointer rounded-lg border border-border bg-background"
                  />
                </div>
              )}

              <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                <span className="text-[13px] text-foreground">Show grid by default</span>
                <input
                  type="checkbox"
                  checked={settings.showGrid}
                  onChange={(e) => updateSettings({ showGrid: e.target.checked })}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
              </label>
            </section>

            {/* Drawing defaults */}
            <section className="mb-6">
              <div className="mb-2.5 flex items-center gap-1.5">
                <Pencil size={13} className="text-muted-foreground" />
                <span className={cn(sectionLabel, "mb-0")}>Drawing defaults</span>
              </div>
              <p className="mb-3 text-[12px] text-muted-foreground">
                Applied when you open the board and when starting new shapes.
              </p>

              <span className="mb-2 block text-[13px] text-muted-foreground">Stroke color</span>
              <div className="mb-2 grid grid-cols-8 gap-1.5">
                {STROKE_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    onClick={() => updateSettings({ defaultStrokeColor: c })}
                    className="relative h-7 w-7 rounded-full border border-border transition-transform hover:scale-110"
                    style={{
                      background: c,
                      outline:
                        settings.defaultStrokeColor === c
                          ? "2px solid var(--foreground)"
                          : "none",
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
              <input
                type="color"
                value={
                  settings.defaultStrokeColor.startsWith("#")
                    ? settings.defaultStrokeColor
                    : "#6C63FF"
                }
                onChange={(e) => updateSettings({ defaultStrokeColor: e.target.value })}
                className="mb-4 h-8 w-full cursor-pointer rounded-lg border border-border bg-background"
              />

              <span className="mb-2 block text-[13px] text-muted-foreground">Fill color</span>
              <div className="mb-4 grid grid-cols-8 gap-1.5">
                {FILL_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    onClick={() => updateSettings({ defaultFillColor: c })}
                    className="relative h-7 w-7 rounded-full border border-border transition-transform hover:scale-110"
                    style={{
                      background: c === "transparent" ? "var(--background)" : c,
                      outline:
                        settings.defaultFillColor === c
                          ? "2px solid var(--foreground)"
                          : "none",
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>

              <span className="mb-2 block text-[13px] text-muted-foreground">Stroke width</span>
              <div className="flex gap-1.5">
                {WIDTHS.map(({ label, value }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateSettings({ defaultStrokeWidth: value })}
                    className={cn(
                      "flex h-8 flex-1 items-center justify-center rounded-lg border text-[12px] font-medium transition-colors",
                      settings.defaultStrokeWidth === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            {/* Access */}
            <section>
              <div className="mb-2.5 flex items-center gap-1.5">
                <Share2 size={13} className="text-muted-foreground" />
                <span className={cn(sectionLabel, "mb-0")}>Access</span>
              </div>
              <p className="mb-3 text-[13px] text-muted-foreground">
                Anyone with the board link can join and edit. Manage sharing from the Share dialog.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onShareClick();
                }}
                className="flex h-9 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-[13px] text-foreground transition-colors hover:bg-muted"
              >
                <Share2 size={14} />
                Open share settings
              </button>
            </section>

            {error && (
              <p className="mt-4 text-[13px] text-destructive">{error}</p>
            )}
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-9 rounded-lg bg-muted px-4 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || (isOwner && !name.trim())}
              className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
