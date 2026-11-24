import {
  INTENTION_NAMES,
  MAP_FRAME,
  type BorderEdge,
  type IncidentStatus,
  type Neighbour,
  type NeighbourStatus,
} from '../sim';
import { IncidentMark, incidentWords } from './IncidentMark';
import { IntentionMark } from './IntentionSign';
import type { MapPalette } from './mapPalette';

/**
 * What a neighbour is and intends, in words, as the map and its card describe it, with any
 * border incident announced or in force on its border.
 */
export function neighbourDescription(
  status: NeighbourStatus,
  incident: IncidentStatus | null = null,
): string {
  const intends = `${status.name}, neighbour: ${INTENTION_NAMES[status.intention].toLowerCase()}`;
  return incident === null ? intends : `${intends}, ${incidentWords(incident).toLowerCase()}`;
}

interface NeighbourMarkProps {
  readonly neighbour: Neighbour;
  readonly status: NeighbourStatus;
  /** The country's border with the neighbour, which its intention is drawn along. */
  readonly border: readonly BorderEdge[];
  /** The border incident announced or in force on that border, if any. */
  readonly incident: IncidentStatus | null;
  readonly palette: MapPalette;
  readonly selected: boolean;
  readonly onSelect: (neighbourId: string) => void;
}

/** How wide the tag under a neighbour's name is drawn for its word. */
function tagWidthOf(word: string): number {
  return word.length * 6.9 + 40;
}

/**
 * A neighbour on the map, under every lens. It is a button: picking it opens the neighbour's
 * card. Its name stands in its land with a tag beneath that gives what it intends as a mark
 * and a word, and the border it shares with the country is drawn by the same intention:
 * nothing while it is peaceful, a dashed line while it is watchful and a solid one, toothed
 * towards the country, while it is hostile. A border incident is drawn along that border from
 * its announcement until it ends: barred diamonds, hollow while it is announced and solid
 * while it is in force, with a second tag beside the first that says which and for how long.
 * None of it rests on colour.
 */
export function NeighbourMark(props: NeighbourMarkProps) {
  const { neighbour, status, border, incident, palette, selected, onSelect } = props;
  const { intention } = status;
  const word = INTENTION_NAMES[intention];
  const width = tagWidthOf(word);
  const [labelX, labelY] = neighbour.label;
  const x = Math.min(MAP_FRAME.width - width / 2 - 4, Math.max(width / 2 + 4, labelX));
  // The tag goes on the side of the name away from the border, clear of a crossing's mark,
  // which reaches from the border towards the name.
  const borderBelow = border.some((edge) => (edge.from[1] + edge.to[1]) / 2 > labelY);
  const borderAbove = border.some((edge) => (edge.from[1] + edge.to[1]) / 2 < labelY);
  const above = borderBelow && !borderAbove;
  const top = Math.min(MAP_FRAME.height - 26, Math.max(4, above ? labelY - 38 : labelY + 8));
  // An incident's tag stands beside the intention's, on whichever side has the room. Its
  // marks stand just outside the border, at the middle of every other stretch long enough to
  // hold one, clear of a hostile border's teeth, which point the other way.
  const incidentTag = incident === null ? null : `▲ ${incidentWords(incident)}`;
  const incidentWidth = incidentTag === null ? 0 : incidentTag.length * 6.7 + 22;
  const beside = x + width / 2 + 6 + incidentWidth / 2;
  const incidentX =
    beside + incidentWidth / 2 + 4 <= MAP_FRAME.width
      ? beside
      : x - width / 2 - 6 - incidentWidth / 2;
  const incidentMarks = border
    .filter((edge) => lengthOf(edge) >= 28)
    .filter((_, index) => index % 2 === 0)
    .map(
      (edge) =>
        [
          (edge.from[0] + edge.to[0]) / 2 + edge.outward[0] * 12,
          (edge.from[1] + edge.to[1]) / 2 + edge.outward[1] * 12,
        ] as const,
    );
  const lines = border.map(
    (edge) => `M${edge.from[0]},${edge.from[1]} L${edge.to[0]},${edge.to[1]}`,
  );
  // A tooth at the middle of each stretch of a hostile border, pointing into the country.
  const teeth = border.map((edge) => {
    const [mx, my] = [(edge.from[0] + edge.to[0]) / 2, (edge.from[1] + edge.to[1]) / 2];
    const length = Math.hypot(edge.to[0] - edge.from[0], edge.to[1] - edge.from[1]) || 1;
    const [ux, uy] = [(edge.to[0] - edge.from[0]) / length, (edge.to[1] - edge.from[1]) / length];
    const [ix, iy] = [-edge.outward[0], -edge.outward[1]];
    return `M${mx - ux * 6},${my - uy * 6} L${mx + ix * 9},${my + iy * 9} L${mx + ux * 6},${my + uy * 6} Z`;
  });
  return (
    <g
      className="map__neighbour"
      role="button"
      tabIndex={0}
      aria-label={neighbourDescription(status, incident)}
      aria-pressed={selected}
      data-intention={intention}
      data-incident={incident === null ? undefined : incident.inForce ? 'in-force' : 'announced'}
      onClick={() => {
        onSelect(neighbour.id);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(neighbour.id);
        }
      }}
    >
      <title>{neighbourDescription(status, incident)}</title>
      {intention !== 'peaceful' && (
        <g className="map__neighbour-border" fill="none" strokeLinecap="round">
          <path d={lines.join(' ')} stroke={palette.tagBackground} strokeWidth="7" />
          <path
            d={lines.join(' ')}
            stroke={palette.tagText}
            strokeWidth={intention === 'hostile' ? 3.5 : 2.5}
            {...(intention === 'watchful' ? { strokeDasharray: '7 7' } : {})}
          />
          {intention === 'hostile' && (
            <path
              d={teeth.join(' ')}
              fill={palette.tagText}
              stroke={palette.tagBackground}
              strokeWidth="1"
              strokeLinejoin="round"
            />
          )}
        </g>
      )}
      <text
        className="map__neighbour-label"
        x={labelX}
        y={labelY}
        fill={selected ? palette.selection : palette.neighbourLabel}
      >
        {neighbour.name}
      </text>
      <rect
        className="map__neighbour-tag"
        x={x - width / 2}
        y={top}
        width={width}
        height="22"
        rx="11"
        fill={palette.tagBackground}
        stroke={selected ? palette.selection : 'none'}
        strokeWidth="2"
      />
      <g transform={`translate(${x - width / 2 + 15},${top + 11})`}>
        <IntentionMark intention={intention} ink={palette.tagText} />
      </g>
      <text className="map__tag" x={x + 9} y={top + 15.5} fill={palette.tagText}>
        {word}
      </text>
      {incident !== null && (
        <g className="map__incident">
          {incidentMarks.map(([markX, markY]) => (
            <g key={`${markX} ${markY}`} transform={`translate(${markX},${markY})`}>
              <IncidentMark
                inForce={incident.inForce}
                ink={palette.tagText}
                ground={palette.tagBackground}
              />
            </g>
          ))}
        </g>
      )}
      {incidentTag !== null && (
        <>
          <rect
            className="map__neighbour-tag"
            x={incidentX - incidentWidth / 2}
            y={top}
            width={incidentWidth}
            height="22"
            rx="11"
            fill={palette.tagBackground}
          />
          <text className="map__tag" x={incidentX} y={top + 15.5} fill={palette.tagText}>
            {incidentTag}
          </text>
        </>
      )}
    </g>
  );
}

function lengthOf(edge: BorderEdge): number {
  return Math.hypot(edge.to[0] - edge.from[0], edge.to[1] - edge.from[1]);
}
