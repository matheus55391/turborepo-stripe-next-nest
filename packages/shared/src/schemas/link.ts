import { z } from 'zod';

export const createLinkSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(60, 'Máximo 60 caracteres'),
  url: z.string().url('URL inválida'),
  visible: z.boolean().optional(),
});

export const updateLinkSchema = createLinkSchema.partial();

export type CreateLinkForm = z.infer<typeof createLinkSchema>;
export type UpdateLinkForm = z.infer<typeof updateLinkSchema>;
