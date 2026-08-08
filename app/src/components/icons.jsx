/**
 * Inline SVG icons. Stroke-based and sized by font-size so they inherit the
 * button's colour in both themes.
 */
function Svg({ children, ...rest }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const RouteIcon = () => (
  <Svg>
    <circle cx="6" cy="19" r="2.5" />
    <circle cx="18" cy="5" r="2.5" />
    <path d="M8.5 19h5a4 4 0 0 0 0-8h-3a4 4 0 0 1 0-8h5" />
  </Svg>
)

export const SwapIcon = () => (
  <Svg>
    <path d="M4 8h13m-3-3 3 3-3 3" />
    <path d="M20 16H7m3-3-3 3 3 3" />
  </Svg>
)

export const SearchIcon = () => (
  <Svg>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
)

export const PlusIcon = () => (
  <Svg>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const MinusIcon = () => (
  <Svg>
    <path d="M5 12h14" />
  </Svg>
)

export const FitIcon = () => (
  <Svg>
    <path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" />
  </Svg>
)

export const HomeIcon = () => (
  <Svg>
    <path d="M12 3 3 10v10a1 1 0 0 0 1 1h5v-6h6v6h5a1 1 0 0 0 1-1V10Z" />
  </Svg>
)

export const InfoIcon = () => (
  <Svg>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 7.6v.2" />
  </Svg>
)

export const SunIcon = () => (
  <Svg>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
)

export const MoonIcon = () => (
  <Svg>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
  </Svg>
)

export const BookIcon = () => (
  <Svg>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v14H6.5A2.5 2.5 0 0 0 4 19.5Z" />
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20v4H6.5A2.5 2.5 0 0 1 4 19.5Z" />
  </Svg>
)

export const TerminalIcon = () => (
  <Svg>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="m7 9 3 3-3 3M13 15h4" />
  </Svg>
)

export const MinimiseIcon = () => (
  <Svg>
    <path d="M5 12h14" />
  </Svg>
)

export const RestoreIcon = () => (
  <Svg>
    <path d="m8 14 4-4 4 4" />
  </Svg>
)

export const CloseIcon = () => (
  <Svg>
    <path d="m6 6 12 12M18 6 6 18" />
  </Svg>
)

export const UndoIcon = () => (
  <Svg>
    <path d="M4 9h9a5 5 0 0 1 0 10h-3" />
    <path d="m4 9 4-4M4 9l4 4" />
  </Svg>
)
