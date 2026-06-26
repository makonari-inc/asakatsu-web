import "dotenv/config";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { isHoliday } from "@holiday-jp/holiday_jp";

const RANKING_URL =
  process.env.RANKING_URL || "https://asakatsu-web.vercel.app/ranking";

async function main() {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.ASAKATSU_CHANNEL_ID;
  const force = process.env.FORCE_POST === "1";

  if (!token || !channel) {
    console.error("❌ SLACK_BOT_TOKEN または ASAKATSU_CHANNEL_ID が未設定");
    process.exit(1);
  }

  const todayJst = getTodayJst();
  if (!force && !isBusinessDay(todayJst)) {
    console.log("[ranking-post] 平日ではないためスキップ");
    return;
  }

  const tmpPath = join(tmpdir(), `ranking-${Date.now()}.png`);

  console.log(`[ranking-post] capture: ${RANKING_URL}`);
  await captureRankingPng(RANKING_URL, tmpPath);

  try {
    console.log("[ranking-post] Slack に画像をアップロード...");
    await uploadToSlack({
      token,
      channel,
      filePath: tmpPath,
      title: `朝活ランキング (${formatDate(todayJst)})`,
    });
    console.log("✅ アップロード完了");
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}

async function captureRankingPng(url: string, outPath: string) {
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({
      viewport: { width: 560, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    // 余計な余白なしで 560px のコンテンツ部分だけを撮る
    const content = page.locator("#ranking-capture");
    await content.waitFor({ state: "visible", timeout: 15_000 });
    await content.screenshot({ path: outPath });
  } finally {
    await browser.close();
  }
}

async function uploadToSlack({
  token,
  channel,
  filePath,
  title,
}: {
  token: string;
  channel: string;
  filePath: string;
  title: string;
}) {
  const { readFile, stat } = await import("node:fs/promises");
  const fileBuffer = await readFile(filePath);
  const fileStat = await stat(filePath);
  const filename = "ranking.png";

  // 1. getUploadURLExternal
  const getUrlRes = await fetch(
    `https://slack.com/api/files.getUploadURLExternal?` +
      new URLSearchParams({
        filename,
        length: String(fileStat.size),
      }),
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const getUrlData = await getUrlRes.json();
  if (!getUrlData.ok) {
    throw new Error("getUploadURLExternal failed: " + getUrlData.error);
  }

  // 2. PUT file to upload_url
  const uploadRes = await fetch(getUrlData.upload_url, {
    method: "POST",
    body: fileBuffer,
  });
  if (!uploadRes.ok) {
    throw new Error("upload PUT failed: " + uploadRes.status);
  }

  // 3. completeUploadExternal
  const completeRes = await fetch(
    "https://slack.com/api/files.completeUploadExternal",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        files: [{ id: getUrlData.file_id, title }],
        channel_id: channel,
      }),
    }
  );
  const completeData = await completeRes.json();
  if (!completeData.ok) {
    throw new Error("completeUploadExternal failed: " + completeData.error);
  }
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
  const dow = ["日", "月", "火", "水", "木", "金", "土"][d.getUTCDay()];
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")} (${dow})`;
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
