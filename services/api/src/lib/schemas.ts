import { z } from 'zod';

export const signUpSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  accountName: z.string().min(2).max(255),
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
