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
  const maxStreak = entries.reduce((m, e) => Math.max(m, e.streak), 0);

  return (
    <div className="mx-auto bg-white" style={{ width: 560 }}>
      <div className="bg-gradient-to-br from-sky-500 via-sky-400 to-sky-300 px-5 pb-10 pt-7 text-center text-white">
        <div className="text-[22px] font-extrabold tracking-wide drop-shadow-md">
          ☀️ 今週の朝活ランキング
        </div>
        <div className="mt-1 text-[13px] text-white/90">{period || "今週はこれから"}</div>
        <div className="mt-1 text-[11px] text-white/75">
          9:00 出社までの朝活時間で集計
        </div>
      </div>

      <div className="px-5 pb-7">
        {entries.length === 0 ? (
          <div className="mt-5 rounded-xl bg-white p-9 text-center text-sm leading-loose text-slate-500 shadow">
            今週の朝活はこれから始まります！
            <br />
            ☀️ でチェックインしましょう
          </div>
        ) : (
          <>
            <div className="-mt-4 mb-5 rounded-xl bg-white px-5 py-4 shadow">
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

            <div className="mb-2.5 pl-1 text-[13px] font-bold text-slate-600">
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

            {maxStreak >= 2 && (
              <div className="mt-4 text-center text-[11px] text-slate-500">
                ✨ 最長ストリーク {maxStreak}日連続
              </div>
            )}
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
      <div className="text-[22px] font-extrabold leading-tight text-slate-900">
        {value}
        {unit && (
          <span className="ml-0.5 text-sm font-semibold text-slate-500">
            {unit}
          </span>
        )}
      </div>
      <div className="mt-1 text-[11px] text-slate-500">{label}</div>
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
    <div className="flex items-center gap-3 rounded-lg bg-white px-4 py-2.5 shadow">
      <div className={getRankBadgeClass(rank)}>
        {rank <= 3 ? medalEmoji(rank) : rank}
      </div>
      <span className="flex-1 text-sm font-bold text-slate-900">{name}</span>
      {streak >= 2 && (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700">
          ✨ {streak}日連続
        </span>
      )}
      <span className="text-sm font-extrabold text-slate-900">{totalLabel}</span>
    </div>
  );
}

function getRankBadgeClass(rank: number): string {
  const base =
    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold";
  if (rank === 1)
    return `${base} bg-gradient-to-br from-yellow-300 to-yellow-500 text-white`;
  if (rank === 2)
    return `${base} bg-gradient-to-br from-slate-300 to-slate-400 text-white`;
  if (rank === 3)
    return `${base} bg-gradient-to-br from-orange-300 to-orange-500 text-white`;
  return `${base} bg-slate-100 text-slate-500`;
}

function medalEmoji(rank: number): string {
  return rank.toString();
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
