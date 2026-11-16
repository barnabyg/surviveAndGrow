import type { Country } from '../sim';
import { Crest } from './Crest';

interface StartScreenProps {
  readonly country: Country;
  readonly onStart: () => void;
}

export function StartScreen({ country, onStart }: StartScreenProps) {
  return (
    <main className="start">
      <Crest size={96} />
      <h1 className="start__title">Survive and Grow</h1>
      <p className="start__lead">
        {country.name} is yours to lead. Raise its living standards, and stay in office long enough
        to see it done.
      </p>
      <button type="button" className="button button--primary" onClick={onStart}>
        Start new game
      </button>
    </main>
  );
}
