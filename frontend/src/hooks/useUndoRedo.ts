"use client";

import { useEffect } from "react";
import { useCanvasStore } from "@/store/canvasStore";
import type { SyncEmitters } from "./useSync";

type Props = Pick<SyncEmitters, "emitDraw" | "emitUpdate" | "emitDelete">;

export function useUndoRedo({ emitDraw, emitUpdate, emitDelete }: Props) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      /* Don't hijack shortcuts while the user is typing */
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) return;

      const mod    = e.ctrlKey || e.metaKey;
      const isUndo = mod && !e.shiftKey && e.key.toLowerCase() === "z";
      const isRedo =
        (mod && e.shiftKey && e.key.toLowerCase() === "z") ||
        (mod && e.key.toLowerCase() === "y");

      if (isUndo) {
        e.preventDefault();
        const diff = useCanvasStore.getState().undo();
        if (!diff) return;
        /* sync: things that vanished → delete on server */
        diff.removed.forEach((el) => emitDelete(el.elementId));
        /* sync: things that reverted → update on server */
        diff.updated.forEach((el) => emitUpdate(el));
        /* sync: things that reappeared (undo of a delete) → re-add */
        diff.added.forEach((el) => emitDraw(el));
        return;
      }

      if (isRedo) {
        e.preventDefault();
        const diff = useCanvasStore.getState().redo();
        if (!diff) return;
        /* sync: things that came back → add on server */
        diff.added.forEach((el) => emitDraw(el));
        /* sync: things that moved forward → update on server */
        diff.updated.forEach((el) => emitUpdate(el));
        /* sync: things that were re-deleted → delete on server */
        diff.removed.forEach((el) => emitDelete(el.elementId));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [emitDraw, emitUpdate, emitDelete]);
}
