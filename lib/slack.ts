import crypto from "crypto";

const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET ?? "";

/**
 * Slack からのリクエストが正規のものか検証する
 * @see https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function verifySlackSignature({
  signature,
  timestamp,
  body,
}: {
  signature: string | null;
  timestamp: string | null;
  body: string;
}): boolean {
  if (!SLACK_SIGNING_SECRET) {
    console.error("[slack] SLACK_SIGNING_SECRET is not configured");
    return false;
  }
  if (!signature || !timestamp) return false;

  // リプレイ攻撃対策（5分以上前のリクエストは弾く）
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(timestamp, 10);
  if (Number.isNaN(ts) || Math.abs(now - ts) > 60 * 5) {
    return false;
  }

  const baseString = `v0:${timestamp}:${body}`;
  const expected = `v0=${crypto
    .createHmac("sha256", SLACK_SIGNING_SECRET)
    .update(baseString)
    .digest("hex")}`;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

/**
 * Slack のユーザー表示名を取得する
 */
export async function fetchSlackUserName(userId: string): Promise<string> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.error("[slack] SLACK_BOT_TOKEN is not configured");
    return userId;
  }

  try {
    const res = await fetch(
      `https://slack.com/api/users.info?user=${userId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await res.json();
    if (!data.ok) {
      console.error("[slack] users.info failed:", data.error);
      return userId;
    }
    const profile = data.user?.profile ?? {};
    return (
      profile.display_name ||
      profile.real_name ||
      data.user?.real_name ||
      data.user?.name ||
      userId
    );
  } catch (err) {
    console.error("[slack] users.info exception:", err);
    return userId;
  }
}

/**
 * Slack の event_ts（"1719010800.083113" 形式）を Date に変換
 */
export function eventTsToDate(eventTs: string): Date {
  const epoch = parseFloat(eventTs);
  if (Number.isNaN(epoch)) {
    return new Date();
  }
  return new Date(epoch * 1000);
}

/**
 * UTC Date を JST の日付文字列 (YYYY-MM-DD) に変換
 */
export function toJstDateString(date: Date): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}
