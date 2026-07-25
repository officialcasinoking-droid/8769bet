import { type HTMLAttributes, forwardRef } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      hover = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      default: 'bg-dark-300/50 border border-dark-100',
      outlined: 'bg-transparent border-2 border-dark-100',
      elevated: 'bg-dark-300 shadow-xl shadow-black/30 border border-dark-100',
      gradient: 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 border border-emerald-500/30'
    };

    const paddingStyles = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6'
    };

    return (
      <div
        ref={ref}
        className={`
          rounded-2xl transition-all duration-300
          ${variantStyles[variant]}
          ${paddingStyles[padding]}
          ${hover ? 'hover:shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-500/30' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    )
  }
);

Card.displayName = 'Card';

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = '', children, ...props }, ref) => (
    <div
      ref={ref}
      className={`px-4 py-3 border-b border-dark-100 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);

CardHeader.displayName = 'CardHeader';

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className = '', children, ...props }, ref) => (
    <div ref={ref} className={`p-4 ${className}`} {...props}>
      {children}
    </div>
  )
);

CardContent.displayName = 'CardContent';

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className = '', children, ...props }, ref) => (
    <div
      ref={ref}
      className={`px-4 py-3 border-t border-dark-100 flex items-center gap-2 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);

CardFooter.displayName = 'CardFooter';