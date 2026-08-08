import { useEffect, useRef } from 'react'
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Polyline,
  Tooltip,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CENTER, ZOOM } from '../core/view'
import {
  DISRUPTIONS,
  DISRUPTION_ORDER,
  disruptionOf,
} from '../core/disruptions'

/**
 * Cone / barrier badge for a disrupted path, pinned to the middle of the
 * segment so it reads at a glance from across the room.
 */
function disruptionIcon(stateId) {
  const { glyph, label } = disruptionOf(stateId)
  return L.divIcon({
    className: '',
    html: `<span class="disruption-badge disruption-badge--${stateId}" title="${label}">${glyph}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })
}

/** Midpoint of a polyline's geometry — where the badge sits. */
function midpoint(geometry) {
  return geometry[Math.floor(geometry.length / 2)]
}

/** Sets the start pin wherever the user clicks the basemap. */
function ClickToSetStart({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) })
  return null
}

/**
 * Frames the route on first load, and again only when fitKey changes — i.e.
 * when the user presses "Find route".
 *
 * Deliberately NOT tied to the route itself: refitting on every change would
 * yank the viewport away each time you pick a building or close a path,
 * throwing away whatever zoom and pan you had set up.
 */
function FitRoute({ positions, fitKey }) {
  const map = useMap()
  const lastFit = useRef(null)

  useEffect(() => {
    if (positions.length < 2) return
    if (lastFit.current === fitKey) return
    lastFit.current = fitKey
    map.flyToBounds(L.latLngBounds(positions), {
      padding: [60, 60],
      duration: 0.6,
      maxZoom: 18,
    })
  }, [positions, fitKey, map])

  return null
}

export default function MapView({
  edges,
  disruptions,
  routeEdgeIds,
  routePositions,
  fitKey,
  landmarks,
  fromId,
  toId,
  startPin,
  onLandmarkClick,
  onEdgeState,
  onMapClick,
  onMapReady,
}) {
  return (
    <MapContainer
      center={CENTER}
      zoom={ZOOM}
      className="map"
      maxZoom={19}
      zoomControl={false}
      ref={onMapReady}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />

      <ClickToSetStart onMapClick={onMapClick} />
      <FitRoute positions={routePositions} fitKey={fitKey} />

      {/* The walkable network. Click any segment to set its condition. */}
      {edges.map((e) => {
        const state = disruptions.get(e.id) ?? 'open'
        const { label, factor, hint } = disruptionOf(state)
        const disrupted = state !== 'open'
        const cls = disrupted
          ? `edge edge--${state}`
          : e.assumed
            ? 'edge edge--assumed'
            : 'edge'
        return (
          <Polyline
            key={e.id}
            positions={e.geometry}
            pathOptions={{ className: cls, weight: disrupted ? 5 : 3 }}
            eventHandlers={{
              click: (ev) => L.DomEvent.stopPropagation(ev),
            }}
          >
            <Tooltip sticky>
              {disrupted ? (
                <>
                  <b>{label.toUpperCase()}</b> — {e.weight} m
                  {factor !== Infinity && ` costing ${Math.round(e.weight * factor)} m`}
                </>
              ) : (
                <>
                  {e.weight} m{e.assumed && ' — assumed walkway'} · click to
                  disrupt
                </>
              )}
            </Tooltip>

            <Popup className="edge-pop" closeButton={false} minWidth={210}>
              <div className="edge-pop-head">
                <b>Path condition</b>
                <span>{e.weight} m</span>
              </div>

              <div className="edge-pop-btns">
                {DISRUPTION_ORDER.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={`chip chip--${id}${id === state ? ' is-on' : ''}`}
                    onClick={() => onEdgeState(e.id, id)}
                    title={DISRUPTIONS[id].hint}
                  >
                    {DISRUPTIONS[id].label}
                  </button>
                ))}
              </div>

              <p className="edge-pop-hint">{hint}</p>

              {disrupted && factor !== Infinity && (
                <p className="edge-pop-cost">
                  Search cost: {e.weight} m × {factor} ={' '}
                  <b>{Math.round(e.weight * factor)} m</b>
                </p>
              )}
            </Popup>
          </Polyline>
        )
      })}

      {/* The computed route, drawn on top. */}
      {routeEdgeIds.map((id) => {
        const e = edges.find((x) => x.id === id)
        if (!e) return null
        return (
          <Polyline
            key={`route-${id}`}
            positions={e.geometry}
            pathOptions={{ className: 'edge edge--route', weight: 7 }}
            interactive={false}
          />
        )
      })}

      {/* A cone / barrier on every disrupted segment. Drawn after the route so
          it stays visible even when the route runs straight through it. */}
      {edges.map((e) => {
        const state = disruptions.get(e.id)
        if (!state) return null
        const point = midpoint(e.geometry)
        if (!point) return null
        return (
          <Marker
            key={`badge-${e.id}`}
            position={point}
            icon={disruptionIcon(state)}
            interactive={false}
            zIndexOffset={500}
          />
        )
      })}

      {/* Where the user clicked, snapped to the network. */}
      {startPin && (
        <CircleMarker
          center={[startPin.lat, startPin.lon]}
          radius={8}
          pathOptions={{ className: 'pin pin--current', weight: 3 }}
          interactive={false}
        >
          <Tooltip direction="top" offset={[0, -8]} permanent>
            Current position
          </Tooltip>
        </CircleMarker>
      )}

      {landmarks.map((lm) => {
        const role = lm.id === fromId ? 'from' : lm.id === toId ? 'to' : 'idle'
        // Each building keeps its own colour so it stays identifiable; the
        // start/destination roles are shown by a heavier ring and a bolder
        // label rather than by overriding the fill.
        const ring =
          role === 'from' ? '#14532d' : role === 'to' ? '#7f1d1d' : '#1f2937'
        return (
          <CircleMarker
            key={lm.id}
            center={[lm.lat, lm.lon]}
            radius={role === 'idle' ? 8 : 13}
            pathOptions={{
              color: ring,
              fillColor: lm.color,
              fillOpacity: 0.92,
              weight: role === 'idle' ? 2 : 4,
              className: 'landmark',
            }}
            eventHandlers={{
              click: (ev) => {
                L.DomEvent.stopPropagation(ev)
                onLandmarkClick(lm.id)
              },
            }}
          >
            <Tooltip
              permanent
              direction="top"
              offset={[0, -9]}
              className={`lm-label lm-label--${role}`}
            >
              <span className="lm-dot" style={{ background: lm.color }} />
              {lm.name}
              {role === 'from' && <b> · START</b>}
              {role === 'to' && <b> · END</b>}
            </Tooltip>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
