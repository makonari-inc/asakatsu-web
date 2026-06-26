import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { reactions } from "../db/schema";

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: pnpm tsx scripts/import-csv.ts <path-to-reactions.csv>");
    process.exit(1);
  }

  const content = readFileSync(csvPath, "utf-8");
  const lines = content.trim().split("\n");
  const header = lines[0].split(",").map((s) => s.trim());
  const dataRows = lines.slice(1);
  console.log("[debug] header:", header);

  // ヘッダーの列番号を取得
  const col = (name: string) => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`column not found: ${name}`);
    return i;
  };
  const dateIdx = col("date");
  const userIdIdx = col("user_id");
  const userNameIdx = col("user_name");
  const emojiIdx = col("emoji");
  const actionIdx = col("action");
  const eventAtIdx = col("event_at");

  // パース
  const parsed = dataRows
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const cols = line.split(",").map((s) => s.trim());
      const eventAt = new Date(cols[eventAtIdx]);
      if (Number.isNaN(eventAt.getTime())) {
        console.error("[debug] Invalid date:", JSON.stringify(cols[eventAtIdx]));
      }
      return {
        date: cols[dateIdx],
        userId: cols[userIdIdx],
        userName: cols[userNameIdx],
        emoji: cols[emojiIdx],
        action: cols[actionIdx],
        eventAt,
      };
    });

  console.log(`📂 CSV から ${parsed.length} 件を読み込みました`);
  if (parsed.length === 0) return;

  // 一旦既存の同じ日付分を消す（再実行を冪等にする）
  const dates = [...new Set(parsed.map((p) => p.date))];
  console.log(`🗑  対象の ${dates.length} 日分を一度クリアします:`, dates);
  await db.delete(reactions).where(inArray(reactions.date, dates));

  // 挿入
  await db.insert(reactions).values(parsed);

  // 表示
  const total = await db.select().from(reactions);
  console.log(`✅ ${parsed.length} 件を挿入しました（テーブル全体: ${total.length} 件）`);
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
