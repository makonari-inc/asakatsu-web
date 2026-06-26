import "dotenv/config";
import { isHoliday } from "@holiday-jp/holiday_jp";

const MORNING_MESSAGE =
  ":sunny: 出社したらスタンプを押しましょう :sunny:\n" +
  "本日も朝活で良いスタートを切りましょう！";

const DEFAULT_REACTION = "sunny";

async function main() {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.ASAKATSU_CHANNEL_ID;
  const force = process.env.FORCE_POST === "1";

  if (!token || !channel) {
    console.error("❌ SLACK_BOT_TOKEN または ASAKATSU_CHANNEL_ID が未設定");
    process.exit(1);
  }

  const todayJst = getTodayJst();
  console.log(`[morning-post] today (JST): ${formatDate(todayJst)}`);

  if (!force && !isBusinessDay(todayJst)) {
    console.log("[morning-post] 平日ではないためスキップ（FORCE_POST=1 で強制実行可）");
    return;
  }

  // 1. メッセージ投稿
  console.log("[morning-post] Slack に朝メッセを投稿します...");
  const postRes = await callSlack("chat.postMessage", token, {
    channel,
    text: MORNING_MESSAGE,
  });
  console.log(`[morning-post] posted: ts=${postRes.ts}`);

  // 2. Bot 自身がスタンプを押す（みんなが押しやすいように）
  console.log(`[morning-post] :${DEFAULT_REACTION}: スタンプを押します...`);
  try {
    await callSlack("reactions.add", token, {
      channel,
      timestamp: postRes.ts,
      name: DEFAULT_REACTION,
    });
    console.log("[morning-post] reaction added");
  } catch (err) {
    // already_reacted 等はエラーにしない
    console.warn("[morning-post] reaction add failed (continuing):", err);
  }

  console.log("✅ 朝メッセ投稿完了");
}

async function callSlack(
  method: string,
  token: string,
  body: Record<string, unknown>
) {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Slack ${method} failed: ${data.error}`);
  }
  return data;
}

function getTodayJst(): Date {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return new Date(
    Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate())
  );
}

function isBusinessDay(date: Date): boolean {
  const dow = date.getUTCDay();
  if (dow === 0 || dow === 6) return false;
  if (isHoliday(date)) return false;
  return true;
}

function formatDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")} (${["日","月","火","水","木","金","土"][d.getUTCDay()]})`;
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
