import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

type ParamValue = string | number | undefined

/**
 * List state (filters, page, sort) kept in the URL: shareable links, back
 * button works, refresh keeps the view. Changing a filter resets the page.
 */
export function useUrlState<S extends Record<string, ParamValue>>(defaults: S) {
  const [params, setParams] = useSearchParams()

  const state = useMemo(() => {
    const result: Record<string, ParamValue> = { ...defaults }
    for (const key of Object.keys(defaults)) {
      const raw = params.get(key)
      if (raw === null) continue
      result[key] = typeof defaults[key] === 'number' ? Number(raw) || defaults[key] : raw
    }
    return result as S
    // eslint-disable-next-line react-hooks/exhaustive-deps -- defaults are static per page
  }, [params])

  const update = useCallback(
    (patch: Partial<S>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === '' || value === defaults[key]) next.delete(key)
            else next.set(key, String(value))
          }
          if (!('page' in patch) && 'page' in defaults) next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- defaults are static per page
    [setParams],
  )

  const reset = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams])

  return [state, update, reset] as const
}
