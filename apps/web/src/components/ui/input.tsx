import type { InputHTMLAttributes } from 'react';
import { fieldClass } from '@/components/ui/form-field';

type Props = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = '', ...props }: Props) {
  return <input className={`${fieldClass} ${className}`.trim()} {...props} />;
}
