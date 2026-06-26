import { and, asc, eq, min, sql } from "drizzle-orm";
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
