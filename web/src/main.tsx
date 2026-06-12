import { StrictMode, useState, type FormEvent } from 'react'
import { createRoot } from 'react-dom/client'
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { Book, BookStatus, CreateBook } from '@rl/shared'
import './index.css'

const STATUSES: BookStatus[] = ['to_read', 'reading', 'finished']

const STATUS_LABELS: Record<BookStatus, string> = {
  to_read: 'To read',
  reading: 'Reading',
  finished: 'Finished',
}

const STATUS_STYLES: Record<BookStatus, string> = {
  to_read: 'bg-slate-100 text-slate-700',
  reading: 'bg-amber-100 text-amber-800',
  finished: 'bg-emerald-100 text-emerald-800',
}

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

function AddBookForm() {
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')

  const addBook = useMutation({
    mutationFn: (body: CreateBook) =>
      api<Book>('/api/books', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['books'] })
      setTitle('')
      setAuthor('')
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    addBook.mutate({ title: trimmed, author: author.trim() || undefined })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Book title"
        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
      />
      <input
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        placeholder="Author (optional)"
        className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
      />
      <button
        type="submit"
        disabled={addBook.isPending || !title.trim()}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {addBook.isPending ? 'Adding…' : 'Add book'}
      </button>
    </form>
  )
}

function BookItem({ book }: { book: Book }) {
  const qc = useQueryClient()
  const invalidate = () => void qc.invalidateQueries({ queryKey: ['books'] })

  const updateBook = useMutation({
    mutationFn: (status: BookStatus) =>
      api<Book>(`/api/books/${book.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: invalidate,
  })

  const deleteBook = useMutation({
    mutationFn: () => api<void>(`/api/books/${book.id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })

  return (
    <li className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-900">{book.title}</p>
        <p className="truncate text-sm text-slate-500">
          {book.author ?? 'Unknown author'}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <select
          value={book.status}
          onChange={(e) => updateBook.mutate(e.target.value as BookStatus)}
          className={`cursor-pointer rounded-full border-0 px-3 py-1 text-xs font-medium ${STATUS_STYLES[book.status]}`}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          onClick={() => deleteBook.mutate()}
          className="rounded-lg px-2 py-1 text-sm text-slate-400 transition hover:bg-red-50 hover:text-red-600"
          aria-label={`Delete ${book.title}`}
        >
          ✕
        </button>
      </div>
    </li>
  )
}

function App() {
  const {
    data: books,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['books'],
    queryFn: () => api<Book[]>('/api/books'),
  })

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Reading List
        </h1>
        <p className="mt-1 text-slate-500">
          Track what you want to read, what you’re reading, and what you’ve
          finished.
        </p>
      </header>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <AddBookForm />
      </section>

      {isLoading && <p className="text-slate-500">Loading…</p>}
      {isError && (
        <p className="text-red-600">
          Could not load books. Is the API running on port 3000?
        </p>
      )}

      {books && books.length === 0 && (
        <p className="text-slate-500">No books yet — add your first one above.</p>
      )}

      {books && books.length > 0 && (
        <ul className="flex flex-col gap-2">
          {books.map((book) => (
            <BookItem key={book.id} book={book} />
          ))}
        </ul>
      )}
    </div>
  )
}

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
