import { formatQuarters, type IncidentStatus } from '../sim';

/**
 * The mark for a border incident, drawn about the centre of a 16 by 16 box: a diamond barred
 * by a cross. It is hollow, with a dashed edge, while the incident is announced, and solid
 * once it is in force, so the two are told apart by shape and never by colour.
 */
export function IncidentMark(props: {
  readonly inForce: boolean;
  /** The colour it is drawn in, and the colour of the ground beneath it. */
  readonly ink: string;
  readonly ground: string;
}) {
  const { inForce, ink, ground } = props;
  return (
    <>
      <path
        d="M0,-7.5 L7.5,0 L0,7.5 L-7.5,0 Z"
        fill={inForce ? ink : ground}
        stroke={inForce ? ground : ink}
        strokeWidth="1.5"
        strokeLinejoin="round"
        {...(inForce ? {} : { strokeDasharray: '3 2' })}
      />
      <path
        d="M-2.8,-2.8 L2.8,2.8 M2.8,-2.8 L-2.8,2.8"
        fill="none"
        stroke={inForce ? ground : ink}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </>
  );
}

/**
 * How long a closed crossing or a region's lost output has to run, counting the quarter being
 * decided: "this quarter and 2 more", or "for this last quarter".
 */
export function quartersLeftWords(quartersLeft: number): string {
  return quartersLeft <= 1 ? 'for this last quarter' : `this quarter and ${quartersLeft - 1} more`;
}

/** Where an incident stands, in a few words: "Border incident in 2 quarters". */
export function incidentWords(
  incident: Pick<IncidentStatus, 'inForce' | 'beginsIn' | 'quartersLeft'>,
) {
  if (!incident.inForce) return `Border incident in ${formatQuarters(incident.beginsIn)}`;
  return incident.quartersLeft <= 1
    ? 'Border incident: last quarter'
    : `Border incident: ${formatQuarters(incident.quartersLeft)} left`;
}
