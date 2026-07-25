import { forwardRef, type TextareaHTMLAttributes } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { label, error, helperText, className = '', id, ...props },
    ref
  ) => {
    const textareaId = id || `textarea-${Math.random().toString(36).slice(2, 9)}`;
    const errorId = `${textareaId}-error`;
    const helperId = `${textareaId}-helper`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={`${error ? errorId : ''} ${helperText ? helperId : ''}`.trim() || undefined}
          className={`
            w-full rounded-lg bg-dark-400 border-2 px-4 py-3 text-white placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
            transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
            resize-y min-h-[100px]
            ${error ? 'border-red-500' : 'border-dark-100 hover:border-dark-200'}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p
            id={errorId}
            className="mt-1.5 text-sm text-red-400"
            role="alert"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-1.5 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    )
  }
);

Textarea.displayName = 'Textarea';