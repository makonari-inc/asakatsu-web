"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const members = [
  "ふかさわ",
  "やまだ",
  "たなか",
  "さとう",
  "すずき",
  "なかむら",
  "おおた",
  "きむら",
];

type CalendarCell =
  | { type: "empty" }
  | { type: "done"; day: number; minutes: number }
  | { type: "future"; day: number };

const calendar: CalendarCell[] = [
  { type: "empty" },
  { type: "empty" },
  { type: "empty" },
  { type: "done", day: 4, minutes: 152 },
  { type: "done", day: 5, minutes: 135 },

  { type: "done", day: 8, minutes: 148 },
  { type: "done", day: 9, minutes: 125 },
  { type: "done", day: 10, minutes: 112 },
  { type: "done", day: 11, minutes: 160 },
  { type: "done", day: 12, minutes: 132 },

  { type: "done", day: 15, minutes: 155 },
  { type: "done", day: 16, minutes: 138 },
  { type: "done", day: 17, minutes: 128 },
  { type: "done", day: 18, minutes: 142 },
  { type: "done", day: 19, minutes: 150 },

  { type: "done", day: 22, minutes: 165 },
  { type: "done", day: 23, minutes: 145 },
  { type: "done", day: 24, minutes: 135 },
  { type: "future", day: 25 },
  { type: "future", day: 26 },

  { type: "future", day: 29 },
  { type: "future", day: 30 },
  { type: "empty" },
  { type: "empty" },
  { type: "empty" },
];

const histogram = [
  { label: "06:30〜", count: 7 },
  { label: "07:00〜", count: 5 },
  { label: "07:30〜", count: 3 },
  { label: "08:00〜", count: 2 },
  { label: "08:30〜", count: 1 },
];

const recentRecords = [
  { date: "6/24 (水)", startedAt: "06:28", duration: "02:32", streak: 13 },
  { date: "6/23 (火)", startedAt: "06:35", duration: "02:25", streak: 12 },
  { date: "6/22 (月)", startedAt: "06:42", duration: "02:18", streak: 11 },
  { date: "6/19 (金)", startedAt: "06:30", duration: "02:30", streak: 10 },
  { date: "6/18 (木)", startedAt: "06:55", duration: "02:05", streak: 9 },
  { date: "6/17 (水)", startedAt: "06:48", duration: "02:12", streak: 8 },
];

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function formatStartTime(minutes: number): string {
  const total = 9 * 60 - minutes;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function getHeatClass(minutes: number): string {
  if (minutes >= 150) return "bg-sky-500 text-white";
  if (minutes >= 120) return "bg-sky-300 text-sky-950";
  return "bg-sky-100 text-sky-900";
}

export default function Home() {
  const [selected, setSelected] = useState(members[0]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <div className="flex flex-1">
        <Sidebar selected={selected} onSelect={setSelected} />
        <MemberDetail name={selected} />
      </div>
    </div>
  );
}

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

function Sidebar({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (name: string) => void;
}) {
  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 bg-white py-5">
      <div className="px-5 pb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
        👥 メンバー
      </div>
      <ul className="flex flex-col">
        {members.map((name) => {
          const isActive = selected === name;
          return (
            <li key={name}>
              <button
                type="button"
                onClick={() => onSelect(name)}
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
                {name}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function MemberDetail({ name }: { name: string }) {
  return (
    <main className="flex-1 overflow-y-auto px-8 py-7 pb-12">
      <div className="mx-auto max-w-4xl">
        <ProfileHeader name={name} />
        <CalendarSection />
        <HistogramSection />
        <RecentRecordsSection />
      </div>
    </main>
  );
}

function ProfileHeader({ name }: { name: string }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
      <div>
        <div className="text-2xl font-extrabold text-slate-900">
          👤 {name} さん
        </div>
        <div className="mt-1 text-sm text-slate-500">
          朝活 127日目 ／ はじめて: 2026年 2月 17日
        </div>
      </div>
      <div className="shrink-0 border-l border-slate-200 pl-7 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
          連続中
        </div>
        <div className="mt-2 flex items-baseline justify-center gap-1.5">
          <span className="text-xl leading-none">✨</span>
          <span className="text-4xl font-extrabold leading-none tracking-tight text-sky-600 tabular-nums">
            13
          </span>
          <span className="text-base font-bold text-slate-500">日</span>
        </div>
      </div>
    </div>
  );
}

function CalendarSection() {
  const weekdays = ["月", "火", "水", "木", "金"];

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-base font-bold text-slate-800">
          📅 2026年 6月
        </div>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-50"
          >
            ◀ 5月
          </Button>
          <Button
            size="sm"
            className="h-8 bg-sky-500 text-xs text-white hover:bg-sky-600"
          >
            今月
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-50"
          >
            7月 ▶
          </Button>
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
            {calendar.map((cell, idx) => (
              <CalendarDay key={idx} cell={cell} />
            ))}
          </div>

          <Separator className="my-3 bg-slate-200" />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-6 text-xs text-slate-500">
              <span>
                朝活{" "}
                <strong className="ml-1 font-extrabold text-slate-900">
                  18日
                </strong>
              </span>
              <span>
                平均開始{" "}
                <strong className="ml-1 font-extrabold text-slate-900">
                  06:38
                </strong>
              </span>
              <span>
                最早{" "}
                <strong className="ml-1 font-extrabold text-slate-900">
                  06:15
                </strong>{" "}
                (6/22)
              </span>
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
        getHeatClass(cell.minutes)
      )}
    >
      <div className="text-[10px] font-medium opacity-60">{cell.day}</div>
      <div className="text-xs">{formatStartTime(cell.minutes)}</div>
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

function HistogramSection() {
  const maxCount = Math.max(...histogram.map((h) => h.count));
  const mostFrequent = histogram.reduce((a, b) =>
    a.count > b.count ? a : b
  ).label;

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-2 pl-1 text-sm font-bold text-slate-700">
        ⏰ 6月の開始時刻の分布
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
            一番多い時間帯：
            <strong className="font-bold text-slate-900">{mostFrequent}</strong>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function RecentRecordsSection() {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-2 pl-1 text-sm font-bold text-slate-700">
        📋 最近の記録
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="px-5 py-2">
          <div className="flex flex-col">
            {recentRecords.map((r, i) => (
              <div
                key={i}
                className={cn(
                  "grid grid-cols-[100px_120px_1fr_auto] items-center gap-4 py-3",
                  i !== recentRecords.length - 1 && "border-b border-slate-200"
                )}
              >
                <div className="text-sm font-bold text-slate-900">{r.date}</div>
                <div className="text-sm text-slate-500">
                  <strong className="font-bold text-slate-900">
                    {r.startedAt}
                  </strong>{" "}
                  開始
                </div>
                <div className="text-sm font-extrabold text-slate-900">
                  朝活 {r.duration}
                </div>
                <Badge
                  variant="secondary"
                  className="bg-sky-50 text-sky-700 hover:bg-sky-50"
                >
                  ✨ {r.streak}日連続
                </Badge>
              </div>
            ))}
          </div>

          <div className="flex justify-center pb-2 pt-1">
            <Button variant="ghost" size="sm" className="text-slate-500">
              すべての履歴を見る ▸
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
