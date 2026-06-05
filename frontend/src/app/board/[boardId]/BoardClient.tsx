"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import type Konva from "konva";
import { getSocket } from "@/lib/socket";
import type { Board, BoardMember } from "@/types/board";
import { Topbar }      from "@/components/board/Topbar";
import { LeftToolbar } from "@/components/board/LeftToolbar";
import { RightPanel }  from "@/components/board/RightPanel";
import { BottomBar }   from "@/components/board/BottomBar";
import { ShareModal }  from "@/components/board/ShareModal";
import { ContextMenu } from "@/components/board/ContextMenu";

const WhiteboardCanvas = dynamic(
  () => import("@/components/canvas/WhiteboardCanvas"),
  { ssr: false }
);

interface Props {
  board:  Board & { members: BoardMember[] };
  userId: string;
}

export default function BoardClient({ board, userId }: Props) {
  const stageRef = useRef<Konva.Stage | null>(null);

  const [onlineUsers, setOnlineUsers]     = useState<string[]>([userId]);
  const [isShareOpen, setIsShareOpen]     = useState(false);
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

  return (
    <>
      {/* global scrollbar + misc overrides injected once */}
      <style>{`
        ::-webkit-scrollbar          { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track    { background: transparent; }
        ::-webkit-scrollbar-thumb    { background: rgba(255,255,255,0.10); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.20); }
      `}</style>

      <div
        className="flex flex-col overflow-hidden"
        style={{ height: "100dvh", background: "#0F1117" }}
      >
        {/* topbar — fixed, z-40 */}
        <Topbar
          board={board}
          userId={userId}
          onlineUsers={onlineUsers}
          onShareClick={() => setIsShareOpen(true)}
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
              boardId={board.id}
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
        <BottomBar stageRef={stageRef} boardName={board.name} />

        {/* share modal — z-60 */}
        <ShareModal
          board={board}
          userId={userId}
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
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
