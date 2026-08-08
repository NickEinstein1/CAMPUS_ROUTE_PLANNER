import L from 'leaflet'
import { PlusIcon, MinusIcon, FitIcon, HomeIcon } from './icons'
import { CENTER, ZOOM } from '../core/view'

/**
 * Zoom, fit-to-route and reset-view, rendered outside the Leaflet container so
 * clicks never reach the basemap.
 */
export default function MapControls({ map, routePositions }) {
  if (!map) return null

  const canFit = routePositions.length >= 2

  return (
    <div className="panel map-controls" role="group" aria-label="Map controls">
      <button
        type="button"
        className="icon-btn"
        onClick={() => map.zoomIn()}
        title="Zoom in"
        aria-label="Zoom in"
      >
        <PlusIcon />
      </button>
      <button
        type="button"
        className="icon-btn"
        onClick={() => map.zoomOut()}
        title="Zoom out"
        aria-label="Zoom out"
      >
        <MinusIcon />
      </button>
      <button
        type="button"
        className="icon-btn"
        disabled={!canFit}
        onClick={() =>
          map.flyToBounds(L.latLngBounds(routePositions), {
            padding: [60, 60],
            duration: 0.6,
            maxZoom: 18,
          })
        }
        title="Fit the route in view"
        aria-label="Fit the route in view"
      >
        <FitIcon />
      </button>
      <button
        type="button"
        className="icon-btn"
        onClick={() => map.flyTo(CENTER, ZOOM, { duration: 0.6 })}
        title="Reset to the campus view"
        aria-label="Reset to the campus view"
      >
        <HomeIcon />
      </button>
    </div>
  )
}
