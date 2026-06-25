import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reactions } from "@/db/schema";
import {
  eventTsToDate,
  fetchSlackUserName,
  toJstDateString,
  verifySlackSignature,
} from "@/lib/slack";

export const runtime = "nodejs";

const ASAKATSU_CHANNEL_ID = process.env.ASAKATSU_CHANNEL_ID;
const ASAKATSU_BOT_USER_ID = process.env.ASAKATSU_BOT_USER_ID;

export async function POST(req: NextRequest) {
  const body = await req.text();

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 初回セットアップ時の URL 検証チャレンジ
  if (payload.type === "url_verification") {
    return NextResponse.json({ challenge: payload.challenge });
  }

  // 署名検証（リクエストが Slack からのものか確認）
  const valid = verifySlackSignature({
    signature: req.headers.get("x-slack-signature"),
    timestamp: req.headers.get("x-slack-request-timestamp"),
    body,
  });
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (payload.type === "event_callback") {
    const event = payload.event as SlackReactionEvent | undefined;
    if (
      event?.type === "reaction_added" ||
      event?.type === "reaction_removed"
    ) {
      // Slack は 3 秒以内のレスポンスを期待するので、
      // 非同期で処理して即座に 200 を返す
      handleReaction(
        event,
        event.type === "reaction_added" ? "added" : "removed"
      ).catch((err) => {
        console.error("[slack/events] handleReaction error:", err);
      });
    }
  }

  return NextResponse.json({ ok: true });
}

async function handleReaction(
  event: SlackReactionEvent,
  action: "added" | "removed"
): Promise<void> {
  // メッセージ以外（ファイル等）への反応は無視
  if (event.item?.type !== "message") return;

  // 朝活チャンネル以外は無視
  if (ASAKATSU_CHANNEL_ID && event.item.channel !== ASAKATSU_CHANNEL_ID) {
    return;
  }

  // Bot 自身が押した場合は無視
  if (ASAKATSU_BOT_USER_ID && event.user === ASAKATSU_BOT_USER_ID) {
    return;
  }

  // Bot の投稿に対する反応のみ記録
  if (ASAKATSU_BOT_USER_ID && event.item_user !== ASAKATSU_BOT_USER_ID) {
    return;
  }

  const userId = event.user;
  if (!userId) return;

  const userName = await fetchSlackUserName(userId);
  const eventAt = eventTsToDate(event.event_ts);

  // 日付は「反応されたメッセージ（朝の投稿）」の日付を採用
  const messageDate = eventTsToDate(event.item.ts);
  const dateStr = toJstDateString(messageDate);

  await db.insert(reactions).values({
    userId,
    userName,
    date: dateStr,
    eventAt,
    emoji: event.reaction,
    action,
  });

  console.log(
    `[slack/events] ${action}: user=${userName}(${userId}) emoji=${event.reaction} at=${eventAt.toISOString()}`
  );
}

// ─── 型定義 ─────────────────────────────────────

type SlackReactionEvent = {
  type: "reaction_added" | "reaction_removed";
  user: string;
  reaction: string;
  item_user?: string;
  item: {
    type: string;
    channel: string;
    ts: string;
  };
  event_ts: string;
};
