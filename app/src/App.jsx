import { useMemo, useState, useCallback, useEffect } from 'react'
import MapView from './components/MapView'
import MapControls from './components/MapControls'
import ControlPanel from './components/ControlPanel'
import ResultsPanel from './components/ResultsPanel'
import NavBar from './components/NavBar'
import Legend from './components/Legend'
import InfoPanel from './components/InfoPanel'
import NotesPanel from './components/NotesPanel'
import Guide from './components/Guide'
import useTheme from './useTheme'
import dijkstra from './core/dijkstra'
import { toFactors, summarise, disruptionOf } from './core/disruptions'
import {
  graph,
  edges,
  landmarks,
  meta,
  grid,
  edgeById,
  landmarkById,
  estimateWalkMinutes,
} from './core/campus'
import './App.css'

const START_DEFAULT = 'library'
const END_DEFAULT = 'gymnasium'

export default function App() {
  const [theme, toggleTheme] = useTheme()
  const [fromId, setFromId] = useState(START_DEFAULT)
  const [toId, setToId] = useState(END_DEFAULT)
  /** Set when the user clicks open map, snapped to the nearest junction. */
  const [currentPos, setCurrentPos] = useState(null)
  /** edge id -> disruption state id. Absent means open. */
  const [disruptions, setDisruptions] = useState(() => new Map())
  /** Alternates so successive building clicks set start, then destination. */
  const [clickStep, setClickStep] = useState(0)
  /** Bumped by "Find route" so the map re-frames even if nothing changed. */
  const [fitKey, setFitKey] = useState(0)
  const [map, setMap] = useState(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [notesOpen, setNotesOpen] = useState(false)
  /** The guide is a full page behind #guide, so it can be linked and shared. */
  const [guideOpen, setGuideOpen] = useState(
    () => window.location.hash.startsWith('#guide'),
  )

  const startNodeId = currentPos ? currentPos.nodeId : landmarkById(fromId).nodeId
  const startLabel = currentPos ? 'Current position' : landmarkById(fromId).name
  const endLabel = landmarkById(toId).name

  const counts = useMemo(() => summarise(disruptions), [disruptions])
  const closedCount = counts.closed

  const result = useMemo(() => {
    const endNodeId = landmarkById(toId).nodeId

    if (startNodeId === endNodeId) {
      return {
        ok: false,
        error: 'Start and destination are the same place.',
        edgeIds: [],
      }
    }

    const factors = toFactors(disruptions)
    const found = dijkstra(graph, startNodeId, endNodeId, factors)

    if (!found) {
      return {
        ok: false,
        error:
          closedCount > 0
            ? `No route — the ${closedCount} closure(s) in effect cut the destination off entirely. Downgrade one to construction and it becomes reachable again, just expensive.`
            : 'No route — these points are not connected on the walkable network.',
        edgeIds: [],
      }
    }

    // The same search with a clear campus, so we can price the disruption.
    const clear =
      factors.size > 0
        ? dijkstra(graph, startNodeId, endNodeId, new Map())
        : found

    // Disrupted edges the route still uses — Dijkstra chose to pay rather than
    // detour, which is the most interesting thing to point at during a demo.
    const throughDisruption = found.edges
      .filter((id) => disruptions.has(id))
      .map((id) => disruptionOf(disruptions.get(id)).label.toLowerCase())

    const minutes = estimateWalkMinutes(found.cost)
    const clearMinutes = estimateWalkMinutes(clear.cost)

    const notes = []
    if (throughDisruption.length > 0) {
      const kinds = [...new Set(throughDisruption)].join(' and ')
      notes.push(
        `Route still crosses ${throughDisruption.length} ${kinds} segment(s) — every detour cost more`,
      )
    }
    if (currentPos) {
      notes.push(`Start snapped ${Math.round(currentPos.snapM)} m to the network`)
    }

    return {
      ok: true,
      from: startLabel,
      to: endLabel,
      distance: Math.round(found.metres),
      minutes,
      settled: found.settled.length,
      stale: found.stale,
      waypoints: Math.max(0, found.path.length - 2),
      edgeIds: found.edges,
      disrupted: factors.size > 0,
      // Extra ground covered and extra time taken versus a clear campus.
      detourMetres: Math.round(found.metres - clear.metres),
      delayMinutes: minutes - clearMinutes,
      rerouted: found.edges.join() !== clear.edges.join(),
      notes,
    }
  }, [
    startNodeId,
    toId,
    disruptions,
    closedCount,
    startLabel,
    endLabel,
    currentPos,
  ])

  const routePositions = useMemo(
    () => result.edgeIds.flatMap((id) => edgeById.get(id)?.geometry ?? []),
    [result.edgeIds],
  )

  const handleLandmarkClick = useCallback(
    (id) => {
      if (clickStep === 0) {
        setCurrentPos(null)
        setFromId(id)
        setClickStep(1)
      } else {
        setToId(id)
        setClickStep(0)
      }
    },
    [clickStep],
  )

  const handleMapClick = useCallback((lat, lon) => {
    setInfoOpen(false)
    const hit = grid.nearest(lat, lon)
    if (!hit) return
    setCurrentPos({
      nodeId: hit.node.id,
      lat: hit.node.lat,
      lon: hit.node.lon,
      snapM: hit.distance,
    })
    setClickStep(1)
  }, [])

  const handleEdgeState = useCallback(
    (edgeId, stateId) => {
      setDisruptions((prev) => {
        const next = new Map(prev)
        if (stateId === 'open') next.delete(edgeId)
        else next.set(edgeId, stateId)
        return next
      })
      map?.closePopup()
    },
    [map],
  )

  const handleFromChange = useCallback((value) => {
    if (value === '__current') return
    setCurrentPos(null)
    setFromId(value)
  }, [])

  const handleSwap = useCallback(() => {
    if (currentPos) return
    setFromId(toId)
    setToId(fromId)
  }, [currentPos, fromId, toId])

  // The notes drawer squeezes the map, so Leaflet has to re-measure once the
  // slide transition has finished or the tiles come out stretched.
  useEffect(() => {
    if (!map) return
    const t = setTimeout(() => map.invalidateSize(), 320)
    return () => clearTimeout(t)
  }, [map, notesOpen])

  // Keep the guide in sync with the address bar, so back/forward and a shared
  // #guide link both work.
  useEffect(() => {
    const onHash = () => setGuideOpen(window.location.hash.startsWith('#guide'))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const openGuide = useCallback(() => {
    window.location.hash = 'guide'
    setGuideOpen(true)
  }, [])

  const closeGuide = useCallback(() => {
    // Clears the hash without pushing another history entry.
    window.history.replaceState(null, '', window.location.pathname)
    setGuideOpen(false)
  }, [])

  return (
    <div className="app">
      <NavBar
        meta={meta}
        theme={theme}
        onToggleTheme={toggleTheme}
        infoOpen={infoOpen}
        onToggleInfo={() => setInfoOpen((v) => !v)}
        notesOpen={notesOpen}
        onToggleNotes={() => setNotesOpen((v) => !v)}
        onOpenGuide={openGuide}
      />

      <div className="body">
      <main className="map-shell">
        <MapView
          edges={edges}
          disruptions={disruptions}
          routeEdgeIds={result.edgeIds}
          routePositions={routePositions}
          fitKey={fitKey}
          landmarks={landmarks}
          fromId={currentPos ? null : fromId}
          toId={toId}
          startPin={currentPos}
          onLandmarkClick={handleLandmarkClick}
          onEdgeState={handleEdgeState}
          onMapClick={handleMapClick}
          onMapReady={setMap}
        />

        <ControlPanel
          landmarks={landmarks}
          fromId={fromId}
          toId={toId}
          usingCurrentPosition={Boolean(currentPos)}
          onFromChange={handleFromChange}
          onToChange={setToId}
          onFindRoute={() => setFitKey((k) => k + 1)}
          onSwap={handleSwap}
          counts={counts}
          disruptionCount={disruptions.size}
          onClearDisruptions={() => setDisruptions(new Map())}
        />

        <MapControls map={map} routePositions={routePositions} />
        <ResultsPanel result={result} meta={meta} />
        <Legend />

        {infoOpen && <InfoPanel onClose={() => setInfoOpen(false)} />}
      </main>

        <NotesPanel
          open={notesOpen}
          onClose={() => setNotesOpen(false)}
          result={result}
          meta={meta}
        />
      </div>

      {guideOpen && <Guide onClose={closeGuide} />}
    </div>
  )
}
