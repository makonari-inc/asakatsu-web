import "dotenv/config";
import { db } from "../db";
import { reactions } from "../db/schema";

async function main() {
  console.log("→ ダミーデータを挿入します...");

  await db.insert(reactions).values({
    userId: "U_TEST_001",
    userName: "テスト太郎",
    date: "2026-06-25",
    eventAt: new Date("2026-06-25T06:30:00+09:00"),
    emoji: "☀️",
    action: "added",
  });

  console.log("→ 全件取得して表示します...");
  const all = await db.select().from(reactions);
  console.log(all);

  console.log(`✅ 完了！合計 ${all.length} 件のデータがあります`);
}

main().catch((err) => {
  console.error("❌ エラー:", err);
  process.exit(1);
});
