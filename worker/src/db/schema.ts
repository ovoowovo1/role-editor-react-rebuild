import { index, integer, jsonb, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export interface ColorBlockDecoTemplate {
  c: string;
  x: number;
  y: number;
  sx: number;
  sy: number;
  r: number;
}

export const colorBlockPresets = pgTable(
  'color_block_presets',
  {
    id: text('id').primaryKey(),
    camp: varchar('camp', { length: 32 }).notNull(),
    name: text('name').notNull(),
    label: text('label').notNull(),
    color: varchar('color', { length: 32 }).notNull(),
    deco: jsonb('deco').$type<ColorBlockDecoTemplate[]>().notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index('color_block_presets_camp_idx').on(table.camp)]
);
