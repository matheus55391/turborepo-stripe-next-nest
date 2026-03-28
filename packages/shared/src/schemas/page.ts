import { z } from 'zod';

export const createPageSchema = z.object({
  slug: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .max(40, 'Máximo 40 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hifens'),
  title: z.string().min(1, 'Título é obrigatório').max(60, 'Máximo 60 caracteres'),
  bio: z.string().max(200, 'Máximo 200 caracteres').optional(),
});

export const updatePageSchema = createPageSchema.partial().extend({
  published: z.boolean().optional(),
});

export const createLinkSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(60, 'Máximo 60 caracteres'),
  url: z.string().url('URL inválida'),
  visible: z.boolean().optional(),
});

export const updateLinkSchema = createLinkSchema.partial();

export type CreatePageForm = z.infer<typeof createPageSchema>;
export type UpdatePageForm = z.infer<typeof updatePageSchema>;
export type CreateLinkForm = z.infer<typeof createLinkSchema>;
export type UpdateLinkForm = z.infer<typeof updateLinkSchema>;
