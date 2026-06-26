import "dotenv/config";

async function main() {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.ASAKATSU_CHANNEL_ID;
  if (!token || !channel) {
    console.error("❌ SLACK_BOT_TOKEN または ASAKATSU_CHANNEL_ID が未設定");
    process.exit(1);
  }

  const text =
    ":sunny: 動作テスト用のスタンプメッセージです :sunny:\n" +
    "このメッセージに ☀️ などスタンプを押してみてください。\n" +
    "Vercel の Webhook と Neon DB に記録されれば成功です！";

  console.log("→ Slack にテストメッセージを投稿します...");

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ channel, text }),
  });
  const data = await res.json();

  if (!data.ok) {
    console.error("❌ chat.postMessage failed:", data.error);
    process.exit(1);
  }

  console.log("");
  console.log("✅ 投稿しました！");
  console.log(`   channel: ${data.channel}`);
  console.log(`   ts:      ${data.ts}`);
  console.log("");
  console.log("👉 Slack でこのメッセージにスタンプを押してください。");
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
