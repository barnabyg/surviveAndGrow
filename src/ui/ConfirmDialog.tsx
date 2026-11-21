import { useEffect, useId, useRef, type ReactNode } from 'react';

interface ConfirmDialogProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly cancelLabel: string;
  readonly confirmLabel: string;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  /** A second way to go ahead, offered beside the main one. */
  readonly alternative?: { readonly label: string; readonly onChoose: () => void };
}

/** A question the player must answer before the game carries on. Escape cancels. */
export function ConfirmDialog(props: ConfirmDialogProps) {
  const { title, children, cancelLabel, confirmLabel, onCancel, onConfirm, alternative } = props;
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      className="dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 className="dialog__title" id={titleId}>
        {title}
      </h2>
      <div className="dialog__body">{children}</div>
      <div className="button-row dialog__actions">
        <button type="button" className="button" onClick={onCancel}>
          {cancelLabel}
        </button>
        {alternative !== undefined && (
          <button type="button" className="button" onClick={alternative.onChoose}>
            {alternative.label}
          </button>
        )}
        <button type="button" className="button button--commit" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

/** Asks before the game in play is given up, to be replayed or left for a new one. */
export function RestartDialog({
  onCancel,
  onRestart,
}: {
  readonly onCancel: () => void;
  readonly onRestart: (how: 'replay' | 'new') => void;
}) {
  return (
    <ConfirmDialog
      title="Restart this game?"
      cancelLabel="Keep playing"
      confirmLabel="Replay this game"
      onCancel={onCancel}
      onConfirm={() => {
        onRestart('replay');
      }}
      alternative={{
        label: 'New game',
        onChoose: () => {
          onRestart('new');
        },
      }}
    >
      Everything played so far is lost, and the saved game with it. Replaying starts this game again
      from its first quarter, with the same weather and the same events. A new game goes back to the
      start screen.
    </ConfirmDialog>
  );
}
