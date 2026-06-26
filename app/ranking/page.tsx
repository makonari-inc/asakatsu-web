import { computeWeeklyRanking } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const { weekDates, entries } = await computeWeeklyRanking();
  const period = formatPeriod(weekDates);
  const teamTotal = entries.reduce((s, e) => s + e.totalMinutes, 0);
  const avgStreak =
    entries.length > 0
      ? Math.round(
          (entries.reduce((s, e) => s + e.streak, 0) / entries.length) * 10
        ) / 10
      : 0;

  return (
    <div
      id="ranking-capture"
      className="mx-auto bg-[#f5f6fa] font-sans"
      style={{ width: 560, color: "#1a1d2e" }}
    >
      {/* ヘッダー：背景画像 + グラデーションオーバーレイ */}
      <div
        className="px-5 pb-10 pt-7 text-center"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.45) 60%, rgba(245,246,250,1) 100%), url('/assets/header_bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center 40%",
        }}
      >
        <div
          className="text-[22px] font-extrabold tracking-wide text-white"
          style={{ textShadow: "0 1px 8px rgba(0,0,0,0.5)" }}
        >
          今週の朝活ランキング
        </div>
        <div className="mt-1 text-[13px] text-white/90">
          {period || "今週はこれから"}
        </div>
        <div className="mt-1 text-[11px] text-white/70">
          9:00出社までの朝活時間で集計
        </div>
      </div>

      <div className="px-5 pb-7">
        {entries.length === 0 ? (
          <div className="rounded-xl bg-white p-9 text-center text-[14px] leading-loose text-[#888ea8] shadow">
            今週の朝活はこれから始まります！
            <br />
            ☀️ でチェックインしましょう
          </div>
        ) : (
          <>
            {/* Summary bar (overlay on header) */}
            <div
              className="-mt-4 mb-5 rounded-xl bg-white px-5 py-4"
              style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.09)" }}
            >
              <div className="flex justify-around">
                <SummaryItem
                  value={`${entries.length}`}
                  unit="人"
                  label="参加人数"
                />
                <SummaryItem value={formatMinutes(teamTotal)} label="チーム合計" />
                <SummaryItem
                  value={`${avgStreak}`}
                  unit="日"
                  label="平均ストリーク"
                />
              </div>
            </div>

            <div
              className="mb-2.5 pl-0.5 text-[13px] font-bold"
              style={{ color: "#444a6a" }}
            >
              ⏱ 今週の朝活時間ランキング
            </div>
            <div className="flex flex-col gap-1.5">
              {entries.map((entry, idx) => (
                <RankingRow
                  key={entry.userId}
                  rank={idx + 1}
                  name={entry.userName}
                  totalLabel={formatMinutes(entry.totalMinutes)}
                  streak={entry.streak}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryItem({
  value,
  unit,
  label,
}: {
  value: string;
  unit?: string;
  label: string;
}) {
  return (
    <div className="text-center">
      <div className="text-[22px] font-extrabold leading-tight">
        {value}
        {unit && (
          <span
            className="ml-0.5 text-sm font-semibold"
            style={{ color: "#888ea8" }}
          >
            {unit}
          </span>
        )}
      </div>
      <div className="mt-1 text-[11px]" style={{ color: "#888ea8" }}>
        {label}
      </div>
    </div>
  );
}

function RankingRow({
  rank,
  name,
  totalLabel,
  streak,
}: {
  rank: number;
  name: string;
  totalLabel: string;
  streak: number;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg bg-white px-4 py-2.5"
      style={{ boxShadow: "0 2px 6px rgba(0,0,0,0.09)" }}
    >
      <RankBadge rank={rank} />
      <span className="flex-1 text-[14px] font-bold">{name}</span>
      {streak >= 2 && (
        <span
          className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold"
          style={{ background: "#fff0f0", color: "#d45060" }}
        >
          🔥 {streak}日連続
        </span>
      )}
      <span className="text-[14px] font-extrabold">{totalLabel}</span>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const base = "flex h-6 w-6 shrink-0 items-center justify-center rounded-full";
  if (rank === 1) {
    return (
      <div
        className={`${base} text-[12px] font-extrabold text-white`}
        style={{ background: "linear-gradient(135deg, #f7c948, #e8a000)" }}
      >
        {rank}
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div
        className={`${base} text-[12px] font-extrabold text-white`}
        style={{ background: "linear-gradient(135deg, #d0d8e8, #9aaac0)" }}
      >
        {rank}
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div
        className={`${base} text-[12px] font-extrabold text-white`}
        style={{ background: "linear-gradient(135deg, #e8b090, #c07040)" }}
      >
        {rank}
      </div>
    );
  }
  return (
    <div
      className={`${base} text-[13px] font-bold`}
      style={{ color: "#9098b8" }}
    >
      {rank}
    </div>
  );
}

function formatMinutes(totalMinutes: number): string {
  if (totalMinutes <= 0) return "0m";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatPeriod(dates: string[]): string {
  if (dates.length === 0) return "";
  const format = (s: string) => {
    const [, m, d] = s.split("-").map(Number);
    const date = new Date(s + "T00:00:00Z");
    const dow = ["日", "月", "火", "水", "木", "金", "土"][date.getUTCDay()];
    return `${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")} (${dow})`;
  };
  if (dates.length === 1) return format(dates[0]);
  return `${format(dates[0])} - ${format(dates[dates.length - 1])}`;
}
