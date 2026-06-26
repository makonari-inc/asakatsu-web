import { isHoliday } from "@holiday-jp/holiday_jp";
import { and, asc, eq, inArray, min } from "drizzle-orm";
import { db } from "@/db";
import { reactions } from "@/db/schema";

export type Member = {
  userId: string;
  userName: string;
};

export type DayRecord = {
  date: string;
  startedAtJst: string;
  startMinutesOfDay: number;
  asakatsuMinutes: number;
};

/**
 * リアクション記録に登場するメンバー一覧（重複なし）
 */
export async function getMembers(): Promise<Member[]> {
  const rows = await db
    .selectDistinctOn([reactions.userId], {
      userId: reactions.userId,
      userName: reactions.userName,
    })
    .from(reactions)
    .where(eq(reactions.action, "added"))
    .orderBy(reactions.userId);
  return rows;
}

/**
 * あるメンバーの「日ごとの朝活開始時刻」一覧
 * - その日の最初に押した added スタンプを「開始時刻」とする
 */
export async function getDailyStartsForUser(
  userId: string
): Promise<DayRecord[]> {
  const rows = await db
    .select({
      date: reactions.date,
      startAtUtc: min(reactions.eventAt).as("start_at_utc"),
    })
    .from(reactions)
    .where(and(eq(reactions.userId, userId), eq(reactions.action, "added")))
    .groupBy(reactions.date)
    .orderBy(asc(reactions.date));

  return rows
    .filter((r): r is { date: string; startAtUtc: Date } => r.startAtUtc != null)
    .map((r) => toDayRecord(r.date, r.startAtUtc));
}

/**
 * UTCの起点時刻と日付から、JST上での開始時刻情報を組み立てる
 */
function toDayRecord(date: string, startAtUtc: Date): DayRecord {
  const jst = new Date(startAtUtc.getTime() + 9 * 60 * 60 * 1000);
  const hours = jst.getUTCHours();
  const minutes = jst.getUTCMinutes();
  const startMinutesOfDay = hours * 60 + minutes;
  const startedAtJst = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  // 9:00出社までの朝活時間（マイナスは0扱い）
  const asakatsuMinutes = Math.max(0, 9 * 60 - startMinutesOfDay);
  return {
    date,
    startedAtJst,
    startMinutesOfDay,
    asakatsuMinutes,
  };
}

/**
 * 連続出社日数（current streak）を計算
 * 平日のみ対象。今日まで連続して朝活しているかを数える
 */
export function computeStreak(records: DayRecord[]): number {
  if (records.length === 0) return 0;

  const recordedDates = new Set(records.map((r) => r.date));

  // 今日(JST)から逆順に平日をたどっていく
  let streak = 0;
  const today = nowJstDate();
  const cursor = new Date(today);

  while (true) {
    const dateStr = toDateString(cursor);
    const isWeekday = cursor.getUTCDay() >= 1 && cursor.getUTCDay() <= 5;

    if (isWeekday) {
      if (recordedDates.has(dateStr)) {
        streak += 1;
      } else if (streak === 0 && dateStr === toDateString(today)) {
        // 今日まだ朝活してない場合は、昨日からカウント開始
      } else {
        break;
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);

    // 安全装置: 1年以上は遡らない
    if (
      (today.getTime() - cursor.getTime()) / (1000 * 60 * 60 * 24) >
      365
    ) {
      break;
    }
  }

  return streak;
}

function nowJstDate(): Date {
  const now = new Date();
  return new Date(now.getTime() + 9 * 60 * 60 * 1000);
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * 週次ランキング用のエントリー
 */
export type RankingEntry = {
  userId: string;
  userName: string;
  totalMinutes: number;
  days: number;
  streak: number;
};

/**
 * 今週（月曜〜今日）の朝活ランキングを計算する
 * - 各営業日について、その日の最も遅い "added" スタンプ時刻を採用
 * - 9:00 までの分数を合計
 * - 合計時間の降順で返す
 */
export async function computeWeeklyRanking(): Promise<{
  weekDates: string[];
  entries: RankingEntry[];
}> {
  const today = nowJstDate();
  const weekDates = thisWeekBusinessDays(today);

  if (weekDates.length === 0) {
    return { weekDates: [], entries: [] };
  }

  // その期間の "added" を全部取得
  const rows = await db
    .select()
    .from(reactions)
    .where(
      and(
        inArray(reactions.date, weekDates),
        eq(reactions.action, "added")
      )
    );

  // user_id × date → latest event_at
  const latestByUserDate = new Map<string, { userName: string; eventAt: Date }>();
  for (const r of rows) {
    const key = `${r.userId}|${r.date}`;
    const existing = latestByUserDate.get(key);
    if (!existing || r.eventAt > existing.eventAt) {
      latestByUserDate.set(key, { userName: r.userName, eventAt: r.eventAt });
    }
  }

  // 集計
  const totals = new Map<
    string,
    { userId: string; userName: string; totalMinutes: number; days: number }
  >();
  for (const [key, { userName, eventAt }] of latestByUserDate) {
    const [userId] = key.split("|");
    const minutes = minutesBeforeNineJst(eventAt);
    if (minutes <= 0) continue;
    const acc = totals.get(userId) ?? {
      userId,
      userName,
      totalMinutes: 0,
      days: 0,
    };
    acc.userName = userName;
    acc.totalMinutes += minutes;
    acc.days += 1;
    totals.set(userId, acc);
  }

  // 各ユーザーの現在のストリーク
  const entries: RankingEntry[] = [];
  for (const t of totals.values()) {
    const records = await getDailyStartsForUser(t.userId);
    const streak = computeStreak(records);
    entries.push({ ...t, streak });
  }

  entries.sort((a, b) => b.totalMinutes - a.totalMinutes);

  return { weekDates, entries };
}

function thisWeekBusinessDays(today: Date): string[] {
  // 今週の月曜から今日まで（祝日除く）
  const dayOfWeek = today.getUTCDay(); // 0=日, 1=月
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - daysSinceMonday);

  const dates: string[] = [];
  const cursor = new Date(monday);
  while (cursor <= today) {
    const dow = cursor.getUTCDay();
    if (dow >= 1 && dow <= 5 && !isHoliday(cursor)) {
      dates.push(toDateString(cursor));
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function minutesBeforeNineJst(utcDate: Date): number {
  const jst = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
  const minutesOfDay = jst.getUTCHours() * 60 + jst.getUTCMinutes();
  return Math.max(0, 9 * 60 - minutesOfDay);
}

/**
 * 当月の開始時刻ヒストグラム（30分刻み 5バケット）
 */
export function computeMonthHistogram(
  records: DayRecord[],
  yearMonth: string
): { label: string; count: number }[] {
  const buckets = [
    { label: "06:30〜", min: 6 * 60 + 30, max: 7 * 60, count: 0 },
    { label: "07:00〜", min: 7 * 60, max: 7 * 60 + 30, count: 0 },
    { label: "07:30〜", min: 7 * 60 + 30, max: 8 * 60, count: 0 },
    { label: "08:00〜", min: 8 * 60, max: 8 * 60 + 30, count: 0 },
    { label: "08:30〜", min: 8 * 60 + 30, max: 9 * 60, count: 0 },
  ];

  for (const r of records) {
    if (!r.date.startsWith(yearMonth)) continue;
    const m = r.startMinutesOfDay;
    for (const b of buckets) {
      if (m >= b.min && m < b.max) {
        b.count += 1;
        break;
      }
    }
    // 06:30より前はあえてどのバケットにも入れない（ユーザー指示）
    if (m < buckets[0].min) {
      buckets[0].count += 1;
    }
  }

  return buckets.map(({ label, count }) => ({ label, count }));
}
