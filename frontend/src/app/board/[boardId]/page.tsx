import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getBoard } from "@/lib/api";
import BoardClient from "./BoardClient";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;

  const { userId, getToken } = await auth();
  if (!userId) redirect("/sign-in");

  const token = await getToken();
  if (!token) redirect("/sign-in");

  let board;
  try {
    board = await getBoard(boardId, token);
  } catch {
    redirect("/dashboard");
  }

  return <BoardClient board={board} userId={userId} />;
}
