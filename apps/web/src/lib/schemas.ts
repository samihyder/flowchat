import { z } from 'zod';
import { isWorkEmail, WORK_EMAIL_MESSAGE } from '@/lib/email-domain';

export const signUpSchema = z.object({
  name: z.string().min(2).max(255),
  email: z
    .string()
    .email()
    .refine(isWorkEmail, { message: WORK_EMAIL_MESSAGE }),
  password: z.string().min(8).max(100),
  accountName: z.string().min(2).max(255),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(16),
  name: z.string().min(2).max(255),
  password: z.string().min(8).max(100),
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const totpVerifySchema = z.object({
  code: z.string().length(6),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
