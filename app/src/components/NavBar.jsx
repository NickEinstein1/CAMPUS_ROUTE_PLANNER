import {
  RouteIcon,
  InfoIcon,
  SunIcon,
  MoonIcon,
  BookIcon,
} from './icons'

/**
 * Slim top bar: identity, graph size, and the three panel toggles.
 * Everything wordy lives behind the (i) and notes buttons.
 */
export default function NavBar({
  meta,
  theme,
  onToggleTheme,
  infoOpen,
  onToggleInfo,
  notesOpen,
  onToggleNotes,
  onOpenGuide,
}) {
  return (
    <nav className="nav">
      <span className="brand">
        <RouteIcon />
        <b>Campus Route Planner</b>
      </span>

      <span className="nav-meta" title="Size of the walkable graph">
        {meta.nodes} nodes · {meta.edges} edges ·{' '}
        {(meta.totalPathMetres / 1000).toFixed(1)} km
      </span>

      <span className="nav-actions">
        <button
          type="button"
          className="ghost guide-btn"
          onClick={onOpenGuide}
          title="Full guide: data structures, algorithm, storage"
        >
          Guide
        </button>
        <button
          type="button"
          className={`icon-btn${notesOpen ? ' is-active' : ''}`}
          onClick={onToggleNotes}
          aria-pressed={notesOpen}
          title="Data structures & algorithms used"
        >
          <BookIcon />
        </button>
        <button
          type="button"
          className={`icon-btn${infoOpen ? ' is-active' : ''}`}
          onClick={onToggleInfo}
          aria-pressed={infoOpen}
          title="How to use this map"
        >
          <InfoIcon />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </span>
    </nav>
  )
}
