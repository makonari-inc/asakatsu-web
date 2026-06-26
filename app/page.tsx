import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  computeMonthHistogram,
  computeStreak,
  getDailyStartsForUser,
  getMembers,
  type DayRecord,
  type Member,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ user?: string; month?: string }>;

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { user: userParam, month: monthParam } = await searchParams;

  const members = await getMembers();
  const selected =
    members.find((m) => m.userId === userParam) ?? members[0] ?? null;

  const records = selected ? await getDailyStartsForUser(selected.userId) : [];

  const currentMonth = monthParam ?? toMonthString(nowJst());

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar members={members} selectedUserId={selected?.userId} />
        {selected ? (
          <MemberDetail
            member={selected}
            records={records}
            month={currentMonth}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

// ─── ヘッダー ──────────────────────────────────────

function Header() {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-sky-200 bg-gradient-to-r from-sky-100 via-sky-50 to-white px-6 py-4 shadow-[0_2px_12px_rgba(14,165,233,0.15)]">
      <div className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight">
        <span className="text-2xl drop-shadow-[0_2px_4px_rgba(14,165,233,0.3)]">
          ☀️
        </span>
        <span className="bg-gradient-to-r from-slate-900 via-sky-700 to-sky-500 bg-clip-text text-transparent">
          朝活レコード
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="border-sky-300 bg-white font-medium text-slate-700 shadow-sm hover:bg-sky-50"
      >
        ⚙ 設定
      </Button>
    </header>
  );
}

// ─── サイドバー ────────────────────────────────────

function Sidebar({
  members,
  selectedUserId,
}: {
  members: Member[];
  selectedUserId?: string;
}) {
  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 bg-white py-5">
      <div className="px-5 pb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
        👥 メンバー
      </div>
      <ul className="flex flex-col">
        {members.length === 0 && (
          <li className="px-5 py-2.5 text-sm text-slate-400">
            まだメンバーがいません
          </li>
        )}
        {members.map((m) => {
          const isActive = selectedUserId === m.userId;
          return (
            <li key={m.userId}>
              <Link
                href={`/?user=${encodeURIComponent(m.userId)}`}
                className={cn(
                  "flex w-full items-center gap-2 border-l-[3px] border-transparent px-5 py-2.5 text-left text-sm font-medium text-slate-600 transition-colors",
                  "hover:bg-slate-50",
                  isActive &&
                    "border-l-sky-500 bg-sky-50 font-bold text-sky-700"
                )}
              >
                <span
                  className={cn(
                    "w-2.5 text-[10px] text-sky-500",
                    isActive ? "opacity-100" : "opacity-0"
                  )}
                >
                  ▶
                </span>
                {m.userName}
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function EmptyState() {
  return (
    <main className="flex flex-1 items-center justify-center px-8 py-7 pb-12">
      <div className="text-center text-slate-500">
        <div className="text-4xl">☀️</div>
        <div className="mt-3 text-base font-bold text-slate-700">
          まだ朝活の記録がありません
        </div>
        <div className="mt-1 text-sm">
          Slack でスタンプを押すと、ここに記録が表示されます
        </div>
      </div>
    </main>
  );
}

// ─── メンバー詳細 ─────────────────────────────────

function MemberDetail({
  member,
  records,
  month,
}: {
  member: Member;
  records: DayRecord[];
  month: string;
}) {
  const streak = computeStreak(records);
  const histogram = computeMonthHistogram(records, month);
  const recentRecords = [...records]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  const firstDate = records[0]?.date;
  const daysSinceStart = firstDate ? daysSince(firstDate) : 0;

  return (
    <main className="flex-1 overflow-y-auto px-8 py-7 pb-12">
      <div className="mx-auto max-w-4xl">
        <ProfileHeader
          member={member}
          streak={streak}
          firstDate={firstDate}
          daysSinceStart={daysSinceStart}
        />
        <CalendarSection
          records={records}
          month={month}
          userId={member.userId}
        />
        <HistogramSection histogram={histogram} />
        <RecentRecordsSection
          records={recentRecords}
          streakBaseline={records}
        />
      </div>
    </main>
  );
}

function ProfileHeader({
  member,
  streak,
  firstDate,
  daysSinceStart,
}: {
  member: Member;
  streak: number;
  firstDate?: string;
  daysSinceStart: number;
}) {
  return (
    <div className="mb-6 flex items-center justify-between gap-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
      <div>
        <div className="text-2xl font-extrabold text-slate-900">
          👤 {member.userName} さん
        </div>
        <div className="mt-1 text-sm text-slate-500">
          {firstDate
            ? `朝活 ${daysSinceStart}日目 ／ はじめて: ${formatJpDate(firstDate)}`
            : "朝活はじめての日を待っています"}
        </div>
      </div>
      <div className="shrink-0 border-l border-slate-200 pl-7 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
          連続中
        </div>
        <div className="mt-2 flex items-baseline justify-center gap-1.5">
          <span className="text-xl leading-none">✨</span>
          <span className="text-4xl font-extrabold leading-none tracking-tight text-sky-600 tabular-nums">
            {streak}
          </span>
          <span className="text-base font-bold text-slate-500">日</span>
        </div>
      </div>
    </div>
  );
}

// ─── カレンダー ────────────────────────────────────

function CalendarSection({
  records,
  month,
  userId,
}: {
  records: DayRecord[];
  month: string;
  userId: string;
}) {
  const cells = buildCalendarCells(records, month);
  const weekdays = ["月", "火", "水", "木", "金"];

  const monthRecords = records.filter((r) => r.date.startsWith(month));
  const totalDays = monthRecords.length;
  const avgMinutes =
    monthRecords.reduce((s, r) => s + r.startMinutesOfDay, 0) /
    Math.max(1, monthRecords.length);
  const earliest = monthRecords.reduce<DayRecord | null>(
    (acc, r) => (acc == null || r.startMinutesOfDay < acc.startMinutesOfDay ? r : acc),
    null
  );

  const [year, m] = month.split("-").map(Number);
  const prevMonth = formatYearMonth(new Date(Date.UTC(year, m - 2, 1)));
  const nextMonth = formatYearMonth(new Date(Date.UTC(year, m, 1)));
  const thisMonth = toMonthString(nowJst());

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-base font-bold text-slate-800">
          📅 {year}年 {m}月
        </div>
        <div className="flex gap-1.5">
          <Link href={`/?user=${userId}&month=${prevMonth}`}>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-50"
            >
              ◀ {parseInt(prevMonth.slice(5))}月
            </Button>
          </Link>
          <Link href={`/?user=${userId}&month=${thisMonth}`}>
            <Button
              size="sm"
              className="h-8 bg-sky-500 text-xs text-white hover:bg-sky-600"
            >
              今月
            </Button>
          </Link>
          <Link href={`/?user=${userId}&month=${nextMonth}`}>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-50"
            >
              {parseInt(nextMonth.slice(5))}月 ▶
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-5 gap-1.5">
            {weekdays.map((wd) => (
              <div
                key={wd}
                className="py-1.5 text-center text-xs font-bold text-slate-500"
              >
                {wd}
              </div>
            ))}
            {cells.map((cell, idx) => (
              <CalendarDay key={idx} cell={cell} />
            ))}
          </div>

          <Separator className="my-3 bg-slate-200" />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-6 text-xs text-slate-500">
              <span>
                朝活{" "}
                <strong className="ml-1 font-extrabold text-slate-900">
                  {totalDays}日
                </strong>
              </span>
              {totalDays > 0 && (
                <>
                  <span>
                    平均開始{" "}
                    <strong className="ml-1 font-extrabold text-slate-900">
                      {formatMinutes(avgMinutes)}
                    </strong>
                  </span>
                  {earliest && (
                    <span>
                      最早{" "}
                      <strong className="ml-1 font-extrabold text-slate-900">
                        {earliest.startedAtJst}
                      </strong>{" "}
                      ({formatMonthDay(earliest.date)})
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <Legend color="bg-sky-500" label="〜06:30" />
              <Legend color="bg-sky-300" label="〜07:00" />
              <Legend color="bg-sky-100" label="07:00〜" />
              <Legend
                color="bg-white border border-dashed border-slate-300"
                label="まだ"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

type CalendarCell =
  | { type: "empty" }
  | { type: "done"; day: number; startedAt: string; minutesOfDay: number }
  | { type: "future"; day: number };

function CalendarDay({ cell }: { cell: CalendarCell }) {
  if (cell.type === "empty") {
    return <div className="h-14" />;
  }
  if (cell.type === "future") {
    return (
      <div className="flex h-14 flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-slate-400">
        <div className="text-[10px] font-medium opacity-60">{cell.day}</div>
        <div className="text-xs font-medium">—</div>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex h-14 cursor-pointer flex-col items-center justify-center rounded-md font-bold transition-transform hover:-translate-y-0.5",
        getHeatClassByStartMinutes(cell.minutesOfDay)
      )}
    >
      <div className="text-[10px] font-medium opacity-60">{cell.day}</div>
      <div className="text-xs">{cell.startedAt}</div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn("inline-block h-3 w-3 rounded-sm", color)} />
      {label}
    </span>
  );
}

// ─── ヒストグラム ──────────────────────────────────

function HistogramSection({
  histogram,
}: {
  histogram: { label: string; count: number }[];
}) {
  const maxCount = Math.max(1, ...histogram.map((h) => h.count));
  const mostFrequent = histogram.reduce((a, b) =>
    a.count > b.count ? a : b
  ).label;
  const hasData = histogram.some((h) => h.count > 0);

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-2 pl-1 text-sm font-bold text-slate-700">
        ⏰ 今月の開始時刻の分布
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="space-y-2.5">
            {histogram.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-[60px_1fr_60px] items-center gap-3"
              >
                <div className="text-sm font-semibold text-slate-700">
                  {row.label}
                </div>
                <div className="h-5 overflow-hidden rounded-md bg-slate-100">
                  <div
                    className="h-full rounded-md bg-gradient-to-r from-sky-300 to-sky-500"
                    style={{ width: `${(row.count / maxCount) * 100}%` }}
                  />
                </div>
                <div className="text-right text-sm font-bold text-slate-900">
                  {row.count} 回
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-4 bg-slate-200" />

          <div className="text-sm text-slate-500">
            {hasData ? (
              <>
                一番多い時間帯：
                <strong className="font-bold text-slate-900">
                  {mostFrequent}
                </strong>
              </>
            ) : (
              "今月の記録はまだありません"
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

// ─── 最近の記録 ───────────────────────────────────

function RecentRecordsSection({
  records,
  streakBaseline,
}: {
  records: DayRecord[];
  streakBaseline: DayRecord[];
}) {
  if (records.length === 0) {
    return null;
  }

  // 日付ごとの「その日までの連続日数」を簡易計算
  const streakByDate = computeStreakByDate(streakBaseline);

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-2 pl-1 text-sm font-bold text-slate-700">
        📋 最近の記録
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="px-5 py-2">
          <div className="flex flex-col">
            {records.map((r, i) => (
              <div
                key={r.date}
                className={cn(
                  "grid grid-cols-[100px_120px_1fr_auto] items-center gap-4 py-3",
                  i !== records.length - 1 && "border-b border-slate-200"
                )}
              >
                <div className="text-sm font-bold text-slate-900">
                  {formatMonthDayWithDow(r.date)}
                </div>
                <div className="text-sm text-slate-500">
                  <strong className="font-bold text-slate-900">
                    {r.startedAtJst}
                  </strong>{" "}
                  開始
                </div>
                <div className="text-sm font-extrabold text-slate-900">
                  朝活 {formatMinutes(r.asakatsuMinutes)}
                </div>
                <Badge
                  variant="secondary"
                  className="bg-sky-50 text-sky-700 hover:bg-sky-50"
                >
                  ✨ {streakByDate.get(r.date) ?? 0}日連続
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

// ─── ヘルパー ─────────────────────────────────────

function nowJst(): Date {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

function toMonthString(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatYearMonth(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatJpDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${y}年 ${m}月 ${d}日`;
}

function formatMonthDay(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${m}/${d}`;
}

function formatMonthDayWithDow(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = ["日", "月", "火", "水", "木", "金", "土"][date.getUTCDay()];
  return `${m}/${d} (${dow})`;
}

function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const min = Math.round(totalMinutes % 60);
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function daysSince(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = Date.UTC(y, m - 1, d);
  const today = nowJst();
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );
  return Math.floor((todayUtc - start) / (1000 * 60 * 60 * 24)) + 1;
}

function getHeatClassByStartMinutes(minutes: number): string {
  if (minutes < 6 * 60 + 30) return "bg-sky-500 text-white"; // 〜06:30
  if (minutes < 7 * 60) return "bg-sky-500 text-white"; // 〜06:30 (legend表記合わせ)
  if (minutes < 8 * 60) return "bg-sky-300 text-sky-950"; // 〜07:00 / 〜08:00 まとめて中
  if (minutes < 9 * 60) return "bg-sky-100 text-sky-900"; // 〜09:00
  return "bg-slate-100 text-slate-400"; // 09:00以降は朝活外
}

function buildCalendarCells(records: DayRecord[], month: string): CalendarCell[] {
  const recordByDate = new Map(records.map((r) => [r.date, r]));
  const [year, m] = month.split("-").map(Number);

  const firstDay = new Date(Date.UTC(year, m - 1, 1));
  const lastDay = new Date(Date.UTC(year, m, 0));
  const today = nowJst();
  const todayStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(
    today.getUTCDate()
  ).padStart(2, "0")}`;

  // 平日のみ拾う
  const cells: CalendarCell[] = [];

  // 月初の前に空セルを入れる
  const firstDow = firstDay.getUTCDay(); // 0=日, 1=月
  const leadingEmptyCount = firstDow === 0 ? 4 : firstDow - 1; // 月曜=0, 火曜=1...
  for (let i = 0; i < Math.max(0, leadingEmptyCount); i++) {
    cells.push({ type: "empty" });
  }

  for (let day = 1; day <= lastDay.getUTCDate(); day++) {
    const cursor = new Date(Date.UTC(year, m - 1, day));
    const dow = cursor.getUTCDay();
    if (dow === 0 || dow === 6) continue; // 土日スキップ
    const dateStr = `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const rec = recordByDate.get(dateStr);
    if (rec) {
      cells.push({
        type: "done",
        day,
        startedAt: rec.startedAtJst,
        minutesOfDay: rec.startMinutesOfDay,
      });
    } else if (dateStr > todayStr) {
      cells.push({ type: "future", day });
    } else {
      cells.push({ type: "future", day });
    }
  }

  // 末尾の空セル（5列に揃える）
  while (cells.length % 5 !== 0) {
    cells.push({ type: "empty" });
  }

  return cells;
}

function computeStreakByDate(records: DayRecord[]): Map<string, number> {
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const result = new Map<string, number>();
  let streak = 0;
  let prevDate: string | null = null;

  for (const r of sorted) {
    if (prevDate == null) {
      streak = 1;
    } else {
      const diff = workdayDiff(prevDate, r.date);
      streak = diff === 1 ? streak + 1 : 1;
    }
    result.set(r.date, streak);
    prevDate = r.date;
  }

  return result;
}

function workdayDiff(from: string, to: string): number {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  let cursor = new Date(Date.UTC(y1, m1 - 1, d1));
  const end = new Date(Date.UTC(y2, m2 - 1, d2));
  let count = 0;
  while (cursor < end) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) count += 1;
  }
  return count;
}
