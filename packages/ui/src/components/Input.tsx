import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, helperText, leftIcon, rightIcon, className = '', id, ...props },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div
              className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500"
              aria-hidden="true"
            >
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={`${error ? errorId : ''} ${helperText ? helperId : ''}`.trim() || undefined}
            className={cn(
              'w-full rounded-lg bg-dark-400 border-2 text-white placeholder-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
              'transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
              leftIcon ? 'pl-10' : 'pl-4',
              rightIcon ? 'pr-10' : 'pr-4',
              'py-2.5 text-sm',
              error ? 'border-red-500' : 'border-dark-100 hover:border-dark-200',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div
              className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-500"
              aria-hidden="true"
            >
              {rightIcon}
            </div>
          )}
        </div>
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

Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string; helperText?: string }>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
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
          className={cn(
            'w-full rounded-lg bg-dark-400 border-2 px-4 py-3 text-white placeholder-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
            'transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
            'resize-y min-h-[100px]',
            error ? 'border-red-500' : 'border-dark-100 hover:border-dark-200',
            className
          )}
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

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, placeholder, className = '', id, ...props }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).slice(2, 9)}`;
    const errorId = `${selectId}-error`;
    const helperId = `${selectId}-helper`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={`${error ? errorId : ''} ${helperText ? helperId : ''}`.trim() || undefined}
          className={cn(
            'w-full rounded-lg bg-dark-400 border-2 px-4 py-2.5 text-white',
            'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
            'transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
            'appearance-none bg-no-repeat bg-right pr-10',
            'bg-[url("data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3e%3cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27M6 8l4 4 4-4%27/%3e%3c/svg%3e")] bg-[right_0.5rem]',
            error ? 'border-red-500' : 'border-dark-100 hover:border-dark-200',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled selected>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
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

Select.displayName = 'Select';

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className = '', ...props }, ref) => {
    const id = props.id || `checkbox-${Math.random().toString(36).slice(2, 9)}`;

    return (
      <div className="flex items-start gap-3">
        <input
          ref={ref}
          type="checkbox"
          id={id}
          className={cn(
            'h-4 w-4 rounded border-gray-300 text-emerald-500 focus:ring-2 focus:ring-emerald-500',
            'bg-dark-400 border-dark-100 hover:border-emerald-400',
            'transition-colors cursor-pointer',
            className
          )}
          {...props}
        />
        {label && (
          <label htmlFor={id} className="cursor-pointer text-white select-none">
            <div className="font-medium">{label}</div>
            {description && <div className="text-xs text-gray-500 mt-0.5">{description}</div>}
          </label>
        )}
      </div>
    )
  }
);

Checkbox.displayName = 'Checkbox';

export interface RadioGroupProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
  className?: string;
}

export const RadioGroup = ({ name, value, onChange, options, className = '' }: RadioGroupProps) => (
  <div className={cn('space-y-2', className)} role="radiogroup" aria-label={name}>
    {options.map((opt) => (
      <label key={opt.value} className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="radio"
          name={name}
          value={opt.value}
          checked={value === opt.value}
          onChange={() => onChange(opt.value)}
          disabled={opt.disabled}
          className="h-4 w-4 text-emerald-500 border-gray-300 focus:ring-2 focus:ring-emerald-500"
        />
        <span className={cn('text-white', opt.disabled && 'opacity-50')}>{opt.label}</span>
      </label>
    ))}
  </div>
);

export interface SwitchProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, description, size = 'md', className = '', ...props }, ref) => {
    const id = props.id || `switch-${Math.random().toString(36).slice(2, 9)}`;

    const sizes = {
      sm: 'h-4 w-7',
      md: 'h-5 w-9',
      lg: 'h-6 w-11'
    };

    return (
      <div className="flex items-center gap-3">
        <label htmlFor={id} className="relative inline-flex items-center cursor-pointer">
          <input
            ref={ref}
            type="checkbox"
            id={id}
            className="peer sr-only"
            {...props}
          />
          <div
            className={cn(
              'relative rounded-full bg-gray-600 peer-focus:ring-2 peer-focus:ring-emerald-500 peer-focus:ring-offset-2 peer-focus:ring-offset-dark-200 transition-colors',
              'after:content-[""] after:absolute after:top-0.5 after:bg-white after:rounded-full after:transition-all after:shadow',
              'peer-checked:bg-emerald-500 peer-checked:after:translate-x-full',
              sizes[size]
            )}
          >
            <div className={cn('after:w-3 after:h-3', sizes[size].replace('h-', 'after:h-').replace('w-', 'after:w-'))} />
          </div>
        </label>
        {label && (
          <label htmlFor={id} className="cursor-pointer text-white select-none">
            <div className="font-medium">{label}</div>
            {description && <div className="text-xs text-gray-500 mt-0.5">{description}</div>}
          </label>
        )}
      </div>
    )
  }
);

Switch.displayName = 'Switch';