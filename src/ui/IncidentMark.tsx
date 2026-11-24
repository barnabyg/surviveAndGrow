import { BORDER_INCIDENT_NAME, formatQuarters, type IncidentStatus } from '../sim';

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

/** Where an incident stands, in a few words: "Border incident in 2 quarters". */
export function incidentWords(
  incident: Pick<IncidentStatus, 'inForce' | 'beginsIn' | 'quartersLeft'>,
) {
  if (!incident.inForce) return `${BORDER_INCIDENT_NAME} in ${formatQuarters(incident.beginsIn)}`;
  return incident.quartersLeft <= 1
    ? `${BORDER_INCIDENT_NAME}: last quarter`
    : `${BORDER_INCIDENT_NAME}: ${formatQuarters(incident.quartersLeft)} left`;
}
