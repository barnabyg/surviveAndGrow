interface PlaceNoteProps {
  readonly className: string;
  /** Whether this row is the one whose place is picked out on the map. */
  readonly pickedOut: boolean;
}

/**
 * The note on a row that picks a region or a neighbour out on the map. A mark and words say when the row
 * is the one picked out, so that it never rests on the colour of its border. It is hidden
 * from assistive technology, which is told the same by the button's pressed state.
 */
export function PlaceNote({ className, pickedOut }: PlaceNoteProps) {
  return (
    <span className={className} aria-hidden="true">
      {pickedOut ? '◆ Picked out on the map' : 'On the map ›'}
    </span>
  );
}
