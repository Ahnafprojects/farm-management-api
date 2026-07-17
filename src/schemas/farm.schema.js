import { z } from 'zod';

/**
 * Full-body schema for creating/updating a farm. Unknown fields are
 * rejected via `.strict()`.
 */
export const farmBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Name is required')
      .max(100, 'Name must be at most 100 characters'),
    location: z.string().trim().max(150, 'Location must be at most 150 characters').optional(),
    area_hectare: z.coerce.number().positive('area_hectare must be a positive number').optional(),
    crop_type: z.string().trim().max(50, 'crop_type must be at most 50 characters').optional(),
  })
  .strict();

/**
 * Path-parameter schema enforcing a positive-integer farm id.
 */
export const farmIdParamSchema = z.object({
  id: z.coerce
    .number({ invalid_type_error: 'id must be a positive integer' })
    .int('id must be a positive integer')
    .positive('id must be a positive integer'),
});

export default { farmBodySchema, farmIdParamSchema };
