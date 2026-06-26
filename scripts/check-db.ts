import "dotenv/config";
import { desc } from "drizzle-orm";
import { db } from "../db";
import { reactions } from "../db/schema";

async function main() {
  const rows = await db
    .select()
    .from(reactions)
    .orderBy(desc(reactions.eventAt))
    .limit(10);

  console.log(`📊 reactions テーブル: ${rows.length} 件`);
  if (rows.length === 0) {
    console.log("   （まだ何も入ってません）");
  } else {
    console.table(rows);
  }
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
