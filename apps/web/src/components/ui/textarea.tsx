import type { TextareaHTMLAttributes } from 'react';
import { textareaClass } from '@/components/ui/form-field';

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className = '', ...props }: Props) {
  return <textarea className={`${textareaClass} ${className}`.trim()} {...props} />;
}
