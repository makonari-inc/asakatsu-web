import "dotenv/config";

async function main() {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.error("❌ SLACK_BOT_TOKEN が設定されていません");
    console.error("   .env.local に SLACK_BOT_TOKEN=xoxb-... を追加してください");
    process.exit(1);
  }

  console.log("→ Slack の auth.test を呼んで Bot 情報を取得します...");

  const res = await fetch("https://slack.com/api/auth.test", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();

  if (!data.ok) {
    console.error("❌ auth.test failed:", data.error);
    process.exit(1);
  }

  console.log("");
  console.log("✅ Bot 情報を取得できました");
  console.log("───────────────────────────────────────────");
  console.log(`   Team:        ${data.team}`);
  console.log(`   User:        ${data.user}`);
  console.log(`   User ID:     ${data.user_id}  ← これを使います`);
  console.log(`   Team ID:     ${data.team_id}`);
  console.log("───────────────────────────────────────────");
  console.log("");
  console.log("👉 次のステップ:");
  console.log("   .env.local に以下を追加してください:");
  console.log(`   ASAKATSU_BOT_USER_ID=${data.user_id}`);
}

main().catch((err) => {
  console.error("❌ エラー:", err);
  process.exit(1);
});
