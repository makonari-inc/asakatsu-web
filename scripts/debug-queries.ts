import "dotenv/config";
import { getDailyStartsForUser, getMembers } from "../lib/queries";

async function main() {
  const members = await getMembers();
  console.log("👥 members:", members);
  for (const u of members) {
    const r = await getDailyStartsForUser(u.userId);
    console.log(`\n📊 ${u.userName} (${u.userId}) records (${r.length}件):`);
    for (const rec of r) {
      console.log(`   ${rec.date}  start=${rec.startedAtJst}  minutes=${rec.asakatsuMinutes}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
