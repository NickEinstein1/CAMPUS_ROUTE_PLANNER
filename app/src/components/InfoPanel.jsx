import { CloseIcon } from './icons'

/** Short how-to popover, anchored under the (i) button. */
export default function InfoPanel({ onClose }) {
  return (
    <div className="panel info-pop" role="dialog" aria-label="How to use">
      <header className="info-head">
        <b>How to use</b>
        <button
          type="button"
          className="icon-btn"
          onClick={onClose}
          title="Close"
          aria-label="Close"
        >
          <CloseIcon />
        </button>
      </header>

      <ul>
        <li>
          Click a <b>building</b> to set the start, then the destination.
        </li>
        <li>
          Click <b>open ground</b> to drop your position — it snaps to the
          nearest path.
        </li>
        <li>
          Click a <b>path</b> to set its condition — maintenance, construction
          or closed. The route responds immediately.
        </li>
        <li>
          Zoom and pan are kept. <b>Find route</b> re-centres.
        </li>
      </ul>

      <p className="info-foot">
        Dashed amber lines are assumed walkways, not OpenStreetMap data.
        <br />
        Map data © OpenStreetMap contributors, ODbL 1.0.
      </p>
    </div>
  )
}
