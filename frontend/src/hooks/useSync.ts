"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { getSocket, connectSocket, disconnectSocket } from "@/lib/socket";
import { useCanvasStore } from "@/store/canvasStore";
import type { CanvasElement, KonvaData, ToolType } from "@/types/canvas";
import type { DrawPayload } from "@/types/socket";

/* ─── helpers ─────────────────────────────────────────────── */

function toDrawPayload(el: CanvasElement, boardId: string): DrawPayload {
  return {
    boardId,
    elementId: el.elementId,
    type: el.type,
    data: el.data as Record<string, unknown>,
    createdBy: el.createdBy,
  };
}

function fromRawElement(raw: Record<string, unknown>): CanvasElement {
  return {
    elementId: raw.elementId as string,
    type: raw.type as ToolType,
    data: raw.data as KonvaData,
    createdBy: raw.createdBy as string,
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : Date.now(),
  };
}

/* ─── emitter types ────────────────────────────────────────── */

export interface SyncEmitters {
  emitDraw:   (element: CanvasElement) => void;
  emitUpdate: (element: CanvasElement) => void;
  emitDelete: (elementId: string) => void;
  emitCursor: (x: number, y: number) => void;
}

export interface SyncState {
  onlineUsers:   string[];
  remoteCursors: Map<string, { x: number; y: number }>;
}

/* ─── module-level emitter cache ──────────────────────────────
 * Lets BottomBar (and other non-child components) access the
 * current board emitters without prop-drilling.
 * ─────────────────────────────────────────────────────────── */
let _emitters: SyncEmitters | null = null;

export function getEmitters(): SyncEmitters | null {
  return _emitters;
}

/* ─── hook ─────────────────────────────────────────────────── */

export function useSync(boardId: string, userId: string): SyncState & SyncEmitters {
  const { getToken } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [, forceUpdate] = useState(0);

  const remoteCursorsRef = useRef<Map<string, { x: number; y: number; lastSeen: number }>>(new Map());
  const lastCursorEmit   = useRef<number>(0);

  /* ── connect + register listeners ──────────────────────── */
  useEffect(() => {
    let mounted = true;
    let staleCursorInterval: number | null = null;

    /* BUG-5: re-join the room whenever the socket reconnects */
    function handleConnect() {
      getSocket().emit("board:join", boardId);
    }

    /* BUG-9: on auth error, refresh the Clerk token and reconnect */
    function handleConnectError(err: Error): void {
      if (!mounted || !err.message.includes("auth")) return;
      void (async () => {
        try {
          const token = await getToken();
          if (token && mounted) {
            const s = getSocket();
            s.auth = { token };
            s.connect();
          }
        } catch (e) {
          console.error("Token refresh on reconnect failed:", e);
        }
      })();
    }

    /* BUG-25: reconnect when the network comes back online */
    function handleOnline(): void {
      const s = getSocket();
      if (!s.connected && mounted) {
        void connectSocket(getToken)
          .then(() => { if (mounted) s.emit("board:join", boardId); })
          .catch(console.error);
      }
    }

    function handleOffline(): void {
      /* socket.io handles the disconnect automatically */
    }

    async function setup() {
      const socket = getSocket();

      /* Register reconnect/error handlers before the first connect attempt
       * so we don't miss the initial connect_error (BUG-9). */
      socket.on("connect", handleConnect);
      socket.on("connect_error", handleConnectError);

      try {
        await connectSocket(getToken);
      } catch (err) {
        console.error("Socket connection failed:", err);
        return;
      }

      if (!mounted) return;

      socket.emit("board:join", boardId);

      /* board:state — initial full load (no history pollution) */
      socket.on("board:state", (rawElements) => {
        const elements = (rawElements as Record<string, unknown>[]).map(fromRawElement);
        useCanvasStore.getState().setElements(elements);
      });

      /* draw:added — remote element added (no history) */
      socket.on("draw:added", (payload) => {
        if (payload.createdBy === userId) return;
        const el = fromRawElement({
          elementId: payload.elementId,
          type:      payload.type,
          data:      payload.data,
          createdBy: payload.createdBy,
          updatedAt: Date.now(),
        });
        useCanvasStore.getState().addElementRemote(el);
      });

      /* draw:updated — remote element changed (no history) */
      socket.on("draw:updated", (payload) => {
        if (payload.createdBy === userId) return;
        useCanvasStore.getState().updateElementRemote(
          payload.elementId,
          payload.data as Partial<KonvaData>
        );
      });

      /* draw:deleted — remote element removed (no history) */
      socket.on("draw:deleted", (payload) => {
        useCanvasStore.getState().deleteElementRemote(payload.elementId);
      });

      /* cursors:state — initial cursor positions from Redis */
      socket.on("cursors:state", (cursors) => {
        for (const payload of cursors) {
          if (payload.userId === userId) continue;
          remoteCursorsRef.current.set(payload.userId, {
            x: payload.x,
            y: payload.y,
            lastSeen: Date.now(),
          });
        }
        forceUpdate((n) => n + 1);
      });

      /* cursor:moved */
      socket.on("cursor:moved", (payload) => {
        if (payload.userId === userId) return;
        remoteCursorsRef.current.set(payload.userId, {
          x: payload.x,
          y: payload.y,
          lastSeen: Date.now(),
        });
        forceUpdate((n) => n + 1);
      });

      /* cursor:left — user disconnected or left the board */
      socket.on("cursor:left", (payload) => {
        if (remoteCursorsRef.current.delete(payload.userId)) {
          forceUpdate((n) => n + 1);
        }
      });

      /* remove stale remote cursors (> 3s without update) */
      staleCursorInterval = window.setInterval(() => {
        const now = Date.now();
        let changed = false;
        for (const [uid, pos] of remoteCursorsRef.current.entries()) {
          if (now - pos.lastSeen > 3000) {
            remoteCursorsRef.current.delete(uid);
            changed = true;
          }
        }
        if (changed) forceUpdate((n) => n + 1);
      }, 1000);

      /* room:users */
      socket.on("room:users", (userIds) => {
        if (mounted) setOnlineUsers(userIds);
      });

      /* error */
      socket.on("error", (message) => {
        console.error("Socket error:", message);
      });

      /* BUG-25: network event listeners */
      window.addEventListener("online",  handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    void setup();

    return () => {
      mounted = false;
      _emitters = null;
      const socket = getSocket();
      socket.emit("board:leave", boardId);
      socket.off("connect",       handleConnect);
      socket.off("connect_error", handleConnectError);
      socket.off("board:state");
      socket.off("draw:added");
      socket.off("draw:updated");
      socket.off("draw:deleted");
      socket.off("cursors:state");
      socket.off("cursor:moved");
      socket.off("cursor:left");
      socket.off("room:users");
      socket.off("error");
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (staleCursorInterval !== null) window.clearInterval(staleCursorInterval);
      disconnectSocket();
    };
  }, [boardId, userId, getToken]);

  /* ── emitters ───────────────────────────────────────────── */

  function emitDraw(element: CanvasElement): void {
    getSocket().emit("draw:add", toDrawPayload(element, boardId));
  }

  function emitUpdate(element: CanvasElement): void {
    getSocket().emit("draw:update", toDrawPayload(element, boardId));
  }

  function emitDelete(elementId: string): void {
    getSocket().emit("draw:delete", { boardId, elementId });
  }

  function emitCursor(x: number, y: number): void {
    const now = Date.now();
    if (now - lastCursorEmit.current < 16) return;
    lastCursorEmit.current = now;
    getSocket().emit("cursor:move", { boardId, userId, x, y });
  }

  /* cache for cross-component access */
  _emitters = { emitDraw, emitUpdate, emitDelete, emitCursor };

  return {
    onlineUsers,
    remoteCursors: remoteCursorsRef.current,
    emitDraw,
    emitUpdate,
    emitDelete,
    emitCursor,
  };
}
