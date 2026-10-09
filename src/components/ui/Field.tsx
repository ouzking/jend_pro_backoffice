import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/core/utils/cn'

const CONTROL =
  'w-full rounded-lg border border-border bg-surface text-fg shadow-xs placeholder:text-fg-subtle ' +
  'transition-[border-color,box-shadow] duration-150 hover:border-border-strong ' +
  'focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/15 ' +
  'disabled:cursor-not-allowed disabled:bg-surface-3 disabled:opacity-70 ' +
  'aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/15'

export interface FieldProps {
  label: ReactNode
  hint?: ReactNode
  error?: string | null
  required?: boolean
  className?: string
  /** A single control: receives id / aria-describedby / aria-invalid. */
  children: ReactElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }>
}

export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId()
  const descId = `${id}-desc`
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-describedby': hint || error ? descId : undefined,
        'aria-invalid': error ? true : undefined,
      })
    : children
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] font-semibold text-fg">
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        )}
      </label>
      {control}
      {(error || hint) && (
        <p id={descId} className={cn('text-xs', error ? 'text-danger' : 'text-fg-subtle')}>
          {error || hint}
        </p>
      )}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(CONTROL, 'h-9 px-3 text-sm', className)} {...rest} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, rows = 4, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={cn(CONTROL, 'resize-y px-3 py-2 text-sm leading-relaxed', className)} {...rest} />
})

export interface SelectOption<T extends string = string> {
  value: T
  label: string
}

export interface SelectProps<T extends string = string> extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value' | 'size'> {
  options: ReadonlyArray<SelectOption<T>>
  value: T | ''
  onValueChange: (value: T | '') => void
  /** Adds an empty first option (e.g. "Tous les statuts"). */
  placeholder?: string
  size?: 'sm' | 'md'
}

/** Native select (accessible, mobile-friendly) with the console styling. */
export function Select<T extends string = string>({ options, value, onValueChange, placeholder, size = 'md', className, ...rest }: SelectProps<T>) {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onValueChange(e.target.value as T | '')}
        className={cn(CONTROL, 'appearance-none pr-8 pl-3 font-medium', size === 'sm' ? 'h-8 text-[13px]' : 'h-9 text-sm')}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-fg-subtle" />
    </div>
  )
}

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'size'> {
  value: string
  onValueChange: (value: string) => void
  size?: 'sm' | 'md'
}

export function SearchInput({ value, onValueChange, className, size = 'md', placeholder = 'Rechercher…', ...rest }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
      <input
        type="search"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className={cn(CONTROL, 'pr-8 pl-9 [&::-webkit-search-cancel-button]:hidden', size === 'sm' ? 'h-8 text-[13px]' : 'h-9 text-sm')}
        {...rest}
      />
      {value && (
        <button
          type="button"
          onClick={() => onValueChange('')}
          className="absolute top-1/2 right-2 grid size-5 -translate-y-1/2 place-items-center rounded text-fg-subtle hover:bg-surface-3 hover:text-fg"
          aria-label="Effacer la recherche"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}
