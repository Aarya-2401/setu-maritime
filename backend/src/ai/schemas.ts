import { z } from 'zod';

export const coordinatorSchema = z.object({
  intent: z.string(),
  location: z.object({ name: z.string().optional(), latitude: z.number().optional(), longitude: z.number().optional(), harborId: z.number().optional() }).optional(),
  timeRange: z.object({ from: z.string().optional(), to: z.string().optional() }).optional(),
  species: z.string().optional(),
  operation: z.string().optional(),
  requestedAgents: z.array(z.enum(['weather','wind','tide','wave','cyclone','marine-alert','pfz','zone','species','catch'])).min(1),
  reason: z.string().optional()
});

export type CoordinatorRequest = z.infer<typeof coordinatorSchema>;
