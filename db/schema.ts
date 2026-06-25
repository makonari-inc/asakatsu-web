import {
  date,
  index,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const reactions = pgTable(
  "reactions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    userName: text("user_name").notNull(),
    date: date("date").notNull(),
    eventAt: timestamp("event_at", { withTimezone: true }).notNull(),
    emoji: text("emoji").notNull().default("☀️"),
    action: text("action").notNull().default("added"),
  },
  (table) => ({
    dateIdx: index("reactions_date_idx").on(table.date),
    userIdIdx: index("reactions_user_id_idx").on(table.userId),
    userDateIdx: index("reactions_user_date_idx").on(table.userId, table.date),
  })
);

export type Reaction = typeof reactions.$inferSelect;
export type NewReaction = typeof reactions.$inferInsert;
