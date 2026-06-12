import { z } from 'zod'

export const bookStatusSchema = z.enum(['to_read', 'reading', 'finished'])
export type BookStatus = z.infer<typeof bookStatusSchema>

/** Shape of a book as returned by the API (`createdAt` is an ISO string over the wire). */
export const bookSchema = z.object({
  id: z.number().int(),
  userId: z.number().int(),
  title: z.string(),
  author: z.string().nullable(),
  status: bookStatusSchema,
  createdAt: z.string(),
})
export type Book = z.infer<typeof bookSchema>

export const createBookSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  author: z.string().trim().min(1).optional(),
  status: bookStatusSchema.optional(),
})
export type CreateBook = z.infer<typeof createBookSchema>

export const updateBookSchema = createBookSchema.partial()
export type UpdateBook = z.infer<typeof updateBookSchema>
