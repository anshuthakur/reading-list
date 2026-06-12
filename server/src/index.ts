import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { and, desc, eq } from 'drizzle-orm'
import { createBookSchema, updateBookSchema } from '@rl/shared'
import { books } from './db/schema.js'

const DB_PATH = './data/app.db'
mkdirSync(dirname(DB_PATH), { recursive: true })

const sqlite = new Database(DB_PATH)

// Bootstrap the table so `npm run dev` works on a fresh checkout.
// `npm run db:push` (drizzle-kit) stays the source of truth for real migrations.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    author TEXT,
    status TEXT NOT NULL DEFAULT 'to_read',
    created_at INTEGER NOT NULL
  );
`)

const db = drizzle(sqlite, { schema: { books } })

// Stage 1: everything is scoped to a single hardcoded user until auth lands.
const USER_ID = 1

const app = new Hono()

app.get('/api/health', (c) => c.json({ ok: true }))

app.get('/api/books', (c) => {
  const rows = db
    .select()
    .from(books)
    .where(eq(books.userId, USER_ID))
    .orderBy(desc(books.createdAt))
    .all()
  return c.json(rows)
})

app.post('/api/books', async (c) => {
  const parsed = createBookSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400)
  }
  const created = db
    .insert(books)
    .values({ ...parsed.data, userId: USER_ID })
    .returning()
    .get()
  return c.json(created, 201)
})

app.patch('/api/books/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id)) return c.json({ error: 'Invalid id' }, 400)

  const parsed = updateBookSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400)
  }
  if (Object.keys(parsed.data).length === 0) {
    return c.json({ error: 'No fields to update' }, 400)
  }

  const updated = db
    .update(books)
    .set(parsed.data)
    .where(and(eq(books.id, id), eq(books.userId, USER_ID)))
    .returning()
    .get()
  if (!updated) return c.json({ error: 'Not found' }, 404)
  return c.json(updated)
})

app.delete('/api/books/:id', (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isInteger(id)) return c.json({ error: 'Invalid id' }, 400)
  db.delete(books).where(and(eq(books.id, id), eq(books.userId, USER_ID))).run()
  return c.body(null, 204)
})

const port = 3000
serve({ fetch: app.fetch, port }, () => {
  console.log(`API listening on http://localhost:${port}`)
})
