"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  Plus,
  Trash2,
  Users,
  Calendar,
  PenLine,
  ArrowUpRight,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateBoardModal } from "@/components/dashboard/CreateBoardModal";
import { getBoards, createBoard, deleteBoard } from "@/lib/api";
import type { Board } from "@/types/board";

const CARD_GRADIENTS = [
  "linear-gradient(135deg, rgba(108,99,255,0.25) 0%, rgba(62,207,207,0.12) 100%)",
  "linear-gradient(135deg, rgba(250,199,117,0.22) 0%, rgba(240,153,123,0.12) 100%)",
  "linear-gradient(135deg, rgba(151,196,89,0.20) 0%, rgba(62,207,207,0.10) 100%)",
  "linear-gradient(135deg, rgba(212,83,126,0.18) 0%, rgba(108,99,255,0.12) 100%)",
  "linear-gradient(135deg, rgba(62,207,207,0.20) 0%, rgba(108,99,255,0.14) 100%)",
  "linear-gradient(135deg, rgba(240,153,123,0.20) 0%, rgba(250,199,117,0.12) 100%)",
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function previewGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  return CARD_GRADIENTS[Math.abs(hash) % CARD_GRADIENTS.length];
}

export default function DashboardPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();

  const [boards, setBoards]           = useState<Board[]>([]);
  const [loading, setLoading]           = useState(true);
  const [createOpen, setCreateOpen]     = useState(false);
  const [deletingId, setDeletingId]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const token = await getToken();
      if (!token || cancelled) return;
      try {
        const data = await getBoards(token);
        if (!cancelled) setBoards(data);
      } catch {
        /* boards stay empty */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [getToken]);

  async function handleCreate(name: string) {
    const token = await getToken();
    if (!token) throw new Error("Not authenticated");
    const board = await createBoard(name, token);
    router.push(`/board/${board.id}`);
  }

  async function handleDelete(boardId: string) {
    const token = await getToken();
    if (!token) return;
    setDeletingId(boardId);
    try {
      await deleteBoard(boardId, token);
      setBoards((prev) => prev.filter((b) => b.id !== boardId));
    } finally {
      setDeletingId(null);
    }
  }

  const firstName = user?.firstName ?? user?.username ?? "there";
  const memberCount = (b: Board) => b._count?.members ?? b.members?.length ?? 1;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 md:px-6 md:pt-10">
        {/* page header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Workspace
            </p>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Welcome back, {firstName}
            </h1>
            <p className="mt-1.5 text-[14px] text-muted-foreground">
              {loading
                ? "Loading your boards…"
                : boards.length === 0
                  ? "Create your first board to start collaborating."
                  : `${boards.length} board${boards.length !== 1 ? "s" : ""} in your workspace`}
            </p>
          </div>

          <button
            onClick={() => setCreateOpen(true)}
            className="flex h-10 shrink-0 items-center gap-2 self-start rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] sm:self-auto"
          >
            <Plus size={16} />
            New board
          </button>
        </div>

        {/* loading */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                <Skeleton className="h-28 w-full rounded-none bg-muted" />
                <div className="space-y-2 p-4">
                  <Skeleton className="h-4 w-2/3 bg-muted" />
                  <Skeleton className="h-3 w-1/2 bg-muted/70" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* empty state */}
        {!loading && boards.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-20 text-center"
          >
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <PenLine size={24} className="text-primary" />
            </div>
            <h2 className="text-lg font-medium">No boards yet</h2>
            <p className="mt-2 max-w-sm text-[14px] text-muted-foreground">
              Create a whiteboard to sketch ideas, plan projects, and collaborate with your team in real time.
            </p>
            <button
              onClick={() => setCreateOpen(true)}
              className="mt-6 flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-[13px] font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
            >
              <Plus size={15} />
              Create your first board
            </button>
          </motion.div>
        )}

        {/* board grid */}
        {!loading && boards.length > 0 && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.04 } } }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {/* create card */}
            <motion.button
              type="button"
              variants={{
                hidden: { opacity: 0, y: 14 },
                show:   { opacity: 1, y: 0, transition: { duration: 0.28 } },
              }}
              onClick={() => setCreateOpen(true)}
              className="group flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-6 text-center transition-all duration-200 hover:border-primary/60 hover:bg-primary/10 active:scale-[0.98]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 transition-transform group-hover:scale-105">
                <Plus size={22} className="text-primary" />
              </div>
              <div>
                <p className="text-[14px] font-medium">New board</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  Start from scratch
                </p>
              </div>
            </motion.button>

            {/* existing boards */}
            {boards.map((board) => {
              const isOwner = user && board.ownerId === user.id;
              const isDeleting = deletingId === board.id;

              return (
                <motion.div
                  key={board.id}
                  variants={{
                    hidden: { opacity: 0, y: 14 },
                    show:   { opacity: 1, y: 0, transition: { duration: 0.28 } },
                  }}
                >
                  <article
                    role="button"
                    tabIndex={0}
                    onClick={() => !isDeleting && router.push(`/board/${board.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        if (!isDeleting) router.push(`/board/${board.id}`);
                      }
                    }}
                    className="group relative flex min-h-[220px] cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg active:scale-[0.99]"
                  >
                    {/* preview */}
                    <div
                      className="relative h-28 shrink-0 overflow-hidden"
                      style={{ background: previewGradient(board.id) }}
                    >
                      <div
                        className="absolute inset-0 opacity-40"
                        style={{
                          backgroundImage: "radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)",
                          backgroundSize: "20px 20px",
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-full"
                          style={{ background: "rgba(0,0,0,0.35)", backdropFilter: "blur(4px)" }}
                        >
                          <ArrowUpRight size={16} className="text-white" />
                        </div>
                      </div>
                    </div>

                    {/* meta */}
                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="line-clamp-1 text-[15px] font-medium">
                          {board.name}
                        </h2>
                        {isOwner && (
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDelete(board.id);
                            }}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 disabled:opacity-40"
                            aria-label={`Delete ${board.name}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      <div className="mt-auto flex items-center gap-3 pt-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {formatDate(board.updatedAt ?? board.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={11} />
                          {memberCount(board)} member{memberCount(board) !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </article>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </main>

      <CreateBoardModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
