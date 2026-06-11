/** Shared classes for settings forms — consistent focus, text, and caret visibility. */
export const fieldClass =
  'w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 caret-primary-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 transition-shadow disabled:bg-gray-50 disabled:text-gray-500';

export const textareaClass = `${fieldClass} resize-y min-h-[4.5rem] font-normal`;

export const selectClass = `${fieldClass} appearance-none bg-[length:1rem] bg-[right_0.65rem_center] bg-no-repeat pr-9`;

export const checkboxClass =
  'size-4 shrink-0 rounded border-gray-300 text-primary-600 accent-primary-600 focus:ring-2 focus:ring-primary-500/25 focus:ring-offset-0 cursor-pointer';

export const labelClass = 'block text-xs font-medium text-gray-700 mb-1.5';
