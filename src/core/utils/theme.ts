import { useCallback, useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'
const KEY = 'jendpro.theme'
const listeners = new Set<() => void>()

function current(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* storage unavailable: theme still applies for the session */
  }
  listeners.forEach((l) => l())
}

export function useTheme(): [Theme, () => void] {
  const theme = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    current,
    () => 'light' as Theme,
  )
  const toggle = useCallback(() => applyTheme(current() === 'dark' ? 'light' : 'dark'), [])
  return [theme, toggle]
}
