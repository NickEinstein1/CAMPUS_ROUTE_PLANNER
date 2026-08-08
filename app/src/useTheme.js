import { useCallback, useEffect, useState } from 'react'

const KEY = 'crp-theme'
const QUERY = '(prefers-color-scheme: dark)'

function storedTheme() {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

/**
 * Follows the OS setting until the user picks a side, then remembers that
 * choice. Returns [theme, toggle].
 */
export default function useTheme() {
  const [override, setOverride] = useState(storedTheme)
  const [system, setSystem] = useState(() =>
    window.matchMedia(QUERY).matches ? 'dark' : 'light',
  )

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = (e) => setSystem(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const theme = override ?? system

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const toggle = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setOverride(next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // private browsing — the choice just won't survive a reload
    }
  }, [theme])

  return [theme, toggle]
}
