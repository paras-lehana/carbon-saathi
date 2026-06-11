/**
 * Tabs: WAI-ARIA tabs pattern with roving tabindex and automatic activation
 * (arrow keys move focus AND selection — the recommended behaviour when
 * panel switches are cheap, as all ours are client-rendered).
 */
'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  /** Accessible name for the tablist (e.g. "Government schemes"). */
  label: string;
  defaultTabId?: string;
  className?: string;
}

export function Tabs({ items, label, defaultTabId, className }: TabsProps): React.JSX.Element {
  const [activeId, setActiveId] = useState(defaultTabId ?? items[0]?.id ?? '');
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  // useId keeps tab/panel id pairs unique across multiple Tabs instances.
  const baseId = useId();

  const activate = (id: string): void => {
    setActiveId(id);
    tabRefs.current.get(id)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % items.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + items.length) % items.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = items.length - 1;
    if (nextIndex !== null) {
      event.preventDefault(); // keep arrows from scrolling the page
      activate(items[nextIndex].id);
    }
  };

  return (
    <div className={className}>
      <div role="tablist" aria-label={label} className="flex flex-wrap gap-2 border-b border-line">
        {items.map((item, index) => {
          const selected = item.id === activeId;
          return (
            <button
              key={item.id}
              ref={(node) => {
                if (node !== null) tabRefs.current.set(item.id, node);
                else tabRefs.current.delete(item.id);
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveId(item.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={`rounded-t-lg px-4 py-2 font-display text-sm font-semibold transition-colors ${
                selected
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${baseId}-panel-${item.id}`}
          aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={item.id !== activeId}
          // Panels are focusable so keyboard users can reach panel content
          // that starts with non-interactive text.
          tabIndex={0}
          className="pt-4"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
