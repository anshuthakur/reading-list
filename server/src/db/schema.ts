import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const books = sqliteTable('books', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().default(1),
  title: text('title').notNull(),
  author: text('author'),
  status: text('status', { enum: ['to_read', 'reading', 'finished'] })
    .notNull()
    .default('to_read'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
})

export type BookRow = typeof books.$inferSelect
export type NewBookRow = typeof books.$inferInsert
