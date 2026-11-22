import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { readDecisionTab, storeDecisionTab } from './storage';
import { TourTarget } from './tourSteps';
import './DecisionPanel.css';

/** One tab of the decisions column, with a few words on where its panel stands. */
export interface DecisionTab {
  /** The panel's id, as its DecisionPanel gives it. */
  readonly id: string;
  readonly title: string;
  readonly note: string;
  /** The note asks for the player's attention, such as changes not yet committed. */
  readonly pending?: boolean;
}

/** The id of the panel on show in the decisions column. */
const ActiveTab = createContext<string | null>(null);

interface DecisionTabsProps {
  readonly tabs: readonly DecisionTab[];
  /** The panels, each a DecisionPanel whose id is one of the tabs. */
  readonly children: ReactNode;
}

/**
 * The decisions column as tabs, one panel on show at a time, so the column needs little
 * scrolling. Each tab says where its panel stands, so a panel out of sight still shows
 * what is pending in it. The browser remembers the tab chosen. While the guided tour or a
 * lesson points at a panel, its tab is shown, and the chosen one comes back after.
 */
export function DecisionTabs({ tabs, children }: DecisionTabsProps) {
  const first = tabs[0]?.id ?? null;
  const [stored, setChosen] = useState(readDecisionTab);
  const chosen = tabs.some((tab) => tab.id === stored) ? stored : first;
  const toured = useContext(TourTarget);
  const active = tabs.some((tab) => tab.id === toured) ? toured : chosen;
  const list = useRef<HTMLDivElement>(null);

  const choose = (id: string) => {
    setChosen(id);
    storeDecisionTab(id);
  };
  // The arrow keys move between tabs, as in any tab list, and Home and End to either end.
  const step = (from: number, key: string) => {
    const last = tabs.length - 1;
    const to =
      key === 'ArrowRight'
        ? (from + 1) % tabs.length
        : key === 'ArrowLeft'
          ? (from + last) % tabs.length
          : key === 'Home'
            ? 0
            : key === 'End'
              ? last
              : null;
    const tab = to === null ? undefined : tabs[to];
    if (tab === undefined) return false;
    choose(tab.id);
    list.current?.querySelector<HTMLElement>(`#${tab.id}-tab`)?.focus();
    return true;
  };

  return (
    <div className="decision-tabs">
      <div className="tabs" role="tablist" aria-label="Decisions" ref={list}>
        {tabs.map((tab, index) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${tab.id}-tab`}
              className="tab"
              aria-label={tab.title}
              aria-describedby={`${tab.id}-tab-note`}
              aria-selected={selected}
              aria-controls={`${tab.id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => {
                choose(tab.id);
              }}
              onKeyDown={(event) => {
                if (step(index, event.key)) event.preventDefault();
              }}
            >
              <span className="tab__title">{tab.title}</span>
              <span
                id={`${tab.id}-tab-note`}
                className={tab.pending === true ? 'tab__note tab__note--pending' : 'tab__note'}
              >
                {tab.note}
              </span>
            </button>
          );
        })}
      </div>
      <ActiveTab.Provider value={active}>{children}</ActiveTab.Provider>
    </div>
  );
}

interface DecisionPanelProps {
  /** Names the panel: its class, its tab, and what the guided tour points at. */
  readonly id: string;
  readonly children: ReactNode;
}

/** A panel of the decisions column, shown while its tab is the one chosen. */
export function DecisionPanel({ id, children }: DecisionPanelProps) {
  const active = useContext(ActiveTab) === id;
  return (
    <section
      className={`${id} decision-panel`}
      role="tabpanel"
      id={`${id}-panel`}
      aria-labelledby={`${id}-tab`}
      data-tour={id}
      hidden={!active}
    >
      {children}
    </section>
  );
}
