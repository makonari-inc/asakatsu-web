import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { reactions } from "../db/schema";

async function main() {
  console.log("→ テストデータを削除します...");
  const deleted = await db
    .delete(reactions)
    .where(eq(reactions.userId, "U_TEST_001"))
    .returning();
  console.log(`✅ ${deleted.length} 件削除しました`);
}

main().catch((err) => {
  console.error("❌ エラー:", err);
  process.exit(1);
});
