"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Plus, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getBoards, createBoard, deleteBoard } from "@/lib/api";
import type { Board } from "@/types/board";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();

  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const token = await getToken();
      if (!token || cancelled) return;
      try {
        const data = await getBoards(token);
        if (!cancelled) setBoards(data);
      } catch {
        // boards stays empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true };
  }, [getToken]);

  useEffect(() => {
    if (creating) inputRef.current?.focus();
  }, [creating]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const token = await getToken();
    if (!token) return;
    const name = newName.trim() || "Untitled Board";
    const board = await createBoard(name, token);
    setNewName("");
    setCreating(false);
    router.push(`/board/${board.id}`);
  }

  async function handleDelete(boardId: string) {
    const token = await getToken();
    if (!token) return;
    await deleteBoard(boardId, token);
    setBoards((prev) => prev.filter((b) => b.id !== boardId));
  }

  return (
    <div className="min-h-screen bg-background">
      {/* header */}
      <div className="border-b border-border/40 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard size={18} className="text-violet-500" />
            <span className="font-semibold text-sm">My Boards</span>
          </div>
          <Button
            size="sm"
            className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
            onClick={() => setCreating(true)}
          >
            <Plus size={14} />
            New Board
          </Button>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* inline create form */}
        <AnimatePresence>
          {creating && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleCreate}
              className="mb-6 overflow-hidden"
            >
              <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card p-3 shadow-sm">
                <input
                  ref={inputRef}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Board name…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setCreating(false);
                      setNewName("");
                    }
                  }}
                />
                <Button type="submit" size="sm" className="bg-violet-600 hover:bg-violet-700 text-white">
                  Create
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setCreating(false); setNewName(""); }}
                >
                  Cancel
                </Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* loading skeletons */}
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border/40 p-5">
                <Skeleton className="mb-3 h-4 w-2/3" />
                <Skeleton className="mb-2 h-3 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            ))}
          </div>
        )}

        {/* empty state */}
        {!loading && boards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500">
              <LayoutDashboard size={24} />
            </div>
            <p className="text-sm text-muted-foreground">
              No boards yet. Create your first one.
            </p>
          </div>
        )}

        {/* board grid */}
        {!loading && boards.length > 0 && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.05 } } }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {boards.map((board) => (
              <motion.div
                key={board.id}
                variants={{
                  hidden: { opacity: 0, y: 16 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
                }}
              >
                <Card
                  className="group cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => router.push(`/board/${board.id}`)}
                >
                  <CardHeader>
                    <CardTitle className="line-clamp-1">{board.name}</CardTitle>
                    <CardDescription>{formatDate(board.createdAt)}</CardDescription>
                    {user && board.ownerId === user.id && (
                      <CardAction>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDelete(board.id);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                          aria-label="Delete board"
                        >
                          <Trash2 size={13} />
                        </button>
                      </CardAction>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="h-16 rounded-lg bg-muted/50" />
                  </CardContent>
                  <CardFooter className="text-xs text-muted-foreground">
                    {board._count?.members ?? board.members?.length ?? 0} member
                    {(board._count?.members ?? board.members?.length ?? 0) !== 1
                      ? "s"
                      : ""}
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}
