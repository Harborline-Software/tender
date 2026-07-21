import { useEffect, useState } from 'react'

/**
 * JS-gated responsiveness (carrier convention — structural, not fluid).
 * The toolbox collapses panels at breakpoints via `useMediaQuery`, never CSS
 * `md:`/`lg:` utilities, so the collapse logic lives in one place the layout can
 * reason about (a narrow window folds master-detail to a single column).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && 'matchMedia' in window
      ? window.matchMedia(query).matches
      : false,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Below this content width the master-detail folds to a single column. */
export const NARROW_QUERY = '(max-width: 860px)'
