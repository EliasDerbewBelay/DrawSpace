"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import type Konva from "konva";
import { getSocket } from "@/lib/socket";
import type { Board, BoardMember } from "@/types/board";
import { Topbar }      from "@/components/board/Topbar";
import { LeftToolbar } from "@/components/board/LeftToolbar";
import { RightPanel }  from "@/components/board/RightPanel";
import { BottomBar }   from "@/components/board/BottomBar";
import { ShareModal }         from "@/components/board/ShareModal";
import { BoardSettingsModal } from "@/components/board/BoardSettingsModal";
import { ContextMenu }        from "@/components/board/ContextMenu";
import { useCanvasStore }     from "@/store/canvasStore";
import { saveBoard }          from "@/lib/api";
import {
  normalizeBoardSettings,
  resolveCanvasBackgroundColor,
} from "@/types/boardSettings";

const WhiteboardCanvas = dynamic(
  () => import("@/components/canvas/WhiteboardCanvas"),
  { ssr: false }
);

interface Props {
  board:  Board & { members: BoardMember[] };
  userId: string;
}

function applyBoardSettings(settings: unknown) {
  const s = normalizeBoardSettings(settings);
  const store = useCanvasStore.getState();
  store.setShowGrid(s.showGrid);
  store.setStrokeColor(s.defaultStrokeColor);
  store.setFillColor(s.defaultFillColor);
  store.setStrokeWidth(s.defaultStrokeWidth);
  store.setCanvasBackground(resolveCanvasBackgroundColor(s));
}

export default function BoardClient({ board, userId }: Props) {
  const { getToken } = useAuth();
  const stageRef = useRef<Konva.Stage | null>(null);

  const [currentBoard, setCurrentBoard]   = useState(board);
  const [onlineUsers, setOnlineUsers]     = useState<string[]>([userId]);
  const [isShareOpen, setIsShareOpen]     = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [contextMenu, setContextMenu]     = useState<{
    position: { x: number; y: number } | null;
    elementId: string | null;
  }>({ position: null, elementId: null });

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) =>
      prev.position === null && prev.elementId === null
        ? prev
        : { position: null, elementId: null }
    );
  }, []);

  useEffect(() => {
    applyBoardSettings(currentBoard.settings);
  }, [currentBoard.id, currentBoard.settings]);

  /* track online room members */
  useEffect(() => {
    const sock = getSocket();
    function onRoomUsers(ids: string[]) { setOnlineUsers(ids.length ? ids : [userId]); }
    sock.on("room:users", onRoomUsers);
    return () => { sock.off("room:users", onRoomUsers); };
  }, [userId]);

  /* close context menu on canvas pan/zoom wheel (only when open) */
  useEffect(() => {
    function onWheel() { closeContextMenu(); }
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [closeContextMenu]);

  /* best-effort save when leaving the board */
  useEffect(() => {
    return () => {
      void (async () => {
        const token = await getToken();
        if (!token) return;
        const elements = useCanvasStore.getState().elements;
        try {
          await saveBoard(currentBoard.id, elements, token);
        } catch {
          /* ignore — user may have navigated away mid-request */
        }
      })();
    };
  }, [currentBoard.id, getToken]);

  return (
    <>
      <div className="flex flex-col overflow-hidden bg-canvas text-foreground" style={{ height: "100dvh" }}>
        {/* topbar — fixed, z-40 */}
        <Topbar
          board={currentBoard}
          userId={userId}
          onlineUsers={onlineUsers}
          onShareClick={() => setIsShareOpen(true)}
          onSettingsClick={() => setIsSettingsOpen(true)}
          onBoardSaved={(savedAt) =>
            setCurrentBoard((prev) => ({ ...prev, updatedAt: savedAt }))
          }
          stageRef={stageRef}
          onDelete={() => {/* router.push handled inside Topbar */}}
        />

        {/* body row — starts below 56px topbar */}
        <div
          className="flex overflow-hidden"
          style={{ flex: 1, marginTop: 56 }}
        >
          {/* left toolbar — fixed, z-30 */}
          <LeftToolbar />

          {/* canvas area — sits between toolbars */}
          <div
            className="relative overflow-hidden"
            style={{ flex: 1, marginLeft: 44, marginRight: 0 }}
          >
            <WhiteboardCanvas
              boardId={currentBoard.id}
              userId={userId}
              stageRef={stageRef}
              onContextMenu={(pos, elId) =>
                setContextMenu({ position: pos, elementId: elId })
              }
            />
          </div>

          {/* right panel — fixed, z-30, slides in when element selected */}
          <RightPanel />
        </div>

        {/* bottom bar — fixed, z-40, centred */}
        <BottomBar stageRef={stageRef} boardName={currentBoard.name} />

        {/* share modal — z-60 */}
        <ShareModal
          board={currentBoard}
          userId={userId}
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
        />

        <BoardSettingsModal
          board={currentBoard}
          userId={userId}
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onShareClick={() => setIsShareOpen(true)}
          onSaved={(updated) => {
            setCurrentBoard(updated);
            applyBoardSettings(updated.settings);
          }}
        />

        {/* context menu — z-50 */}
        <ContextMenu
          position={contextMenu.position}
          elementId={contextMenu.elementId}
          onClose={closeContextMenu}
          stageRef={stageRef}
        />
      </div>
    </>
  );
}
