import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/core/utils/cn'

/** 6-digit one-time code (TOTP): numeric keyboard on mobile, OS autofill, auto-submit at 6 digits. */
export const CodeInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & { value: string; onValueChange: (v: string) => void; onComplete?: (code: string) => void }
>(function CodeInput({ value, onValueChange, onComplete, className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]*"
      maxLength={6}
      value={value}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 6)
        onValueChange(digits)
        if (digits.length === 6) onComplete?.(digits)
      }}
      placeholder="000000"
      className={cn(
        'h-14 w-full rounded-xl border border-border bg-surface text-center font-mono text-2xl tracking-[0.5em] text-fg shadow-xs placeholder:text-fg-subtle/50',
        'focus:border-brand-500 focus:ring-3 focus:ring-brand-500/15 focus:outline-none aria-[invalid=true]:border-danger',
        className,
      )}
      {...rest}
    />
  )
})
