import { z } from 'zod';

/**
 * Query-string schema for GET /farms: pagination, filters, search, and sort.
 * Extra/unknown query params are rejected to catch typos early.
 */
export const listFarmsQuerySchema = z
  .object({
    page: z.coerce.number().int('page must be an integer').positive('page must be >= 1').default(1),
    limit: z.coerce
      .number()
      .int('limit must be an integer')
      .min(1, 'limit must be >= 1')
      .max(100, 'limit must be <= 100')
      .default(10),
    location: z.string().trim().min(1).optional(),
    crop_type: z.string().trim().min(1).optional(),
    search: z.string().trim().min(1).optional(),
    sort: z.enum(['name', 'area_hectare', 'created_at']).default('created_at'),
    order: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

export default { listFarmsQuerySchema };
