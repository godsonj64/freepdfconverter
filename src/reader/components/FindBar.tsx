import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, X } from 'lucide-react';
import type { EventBus } from '../viewer';

// Mirrors pdf.js' FindState enum.
const FOUND = 0;
const NOT_FOUND = 1;
const WRAPPED = 2;
const PENDING = 3;

interface FindBarProps {
  eventBus: EventBus;
  /** Changes each time the user asks for the find bar (e.g. Ctrl+F again). */
  focusSignal: number;
  onClose: () => void;
}

interface MatchesCount {
  current: number;
  total: number;
}

export const FindBar: React.FC<FindBarProps> = ({ eventBus, focusSignal, onClose }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState({
    highlightAll: true,
    caseSensitive: false,
    entireWord: false,
    matchDiacritics: false,
  });
  const [state, setState] = useState<number | null>(null);
  const [count, setCount] = useState<MatchesCount>({ current: 0, total: 0 });

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [focusSignal]);

  useEffect(() => {
    const onCount = ({ matchesCount }: { matchesCount: MatchesCount }) => setCount(matchesCount);
    const onState = ({ state, matchesCount }: { state: number; matchesCount: MatchesCount }) => {
      setState(state);
      if (matchesCount) setCount(matchesCount);
    };
    eventBus.on('updatefindmatchescount', onCount);
    eventBus.on('updatefindcontrolstate', onState);
    return () => {
      eventBus.off('updatefindmatchescount', onCount);
      eventBus.off('updatefindcontrolstate', onState);
      eventBus.dispatch('findbarclose', { source: null });
    };
  }, [eventBus]);

  const dispatch = (type: '' | 'again', findPrevious = false, next = options, nextQuery = query) => {
    eventBus.dispatch('find', { source: null, type, query: nextQuery, findPrevious, ...next });
  };

  const toggle = (key: keyof typeof options) => {
    const next = { ...options, [key]: !options[key] };
    setOptions(next);
    if (query) dispatch('', false, next);
  };

  let status = '';
  if (query) {
    if (state === PENDING) status = 'Searching…';
    else if (state === NOT_FOUND) status = 'Not found';
    else if (count.total > 0) status = `${count.current} of ${count.total}${state === WRAPPED ? ' · wrapped' : ''}`;
    else if (state === FOUND) status = 'Found';
  }

  return (
    <div
      role="search"
      className="absolute right-3 top-3 z-30 w-[min(26rem,calc(100%-1.5rem))] rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-xl"
    >
      <div className="flex items-center gap-1 p-2">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            dispatch('', false, options, e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              dispatch('again', e.shiftKey);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              onClose();
            }
          }}
          placeholder="Find in document…"
          aria-label="Find in document"
          className={`min-w-0 flex-1 rounded-lg border bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[var(--charcoal)]/25 ${
            state === NOT_FOUND && query ? 'bg-red-50 ring-1 ring-red-400' : ''
          }`}
        />
        <span className="w-24 shrink-0 text-right text-xs font-semibold tabular-nums text-[#555]" aria-live="polite">
          {state === PENDING && query ? <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin" /> : status}
        </span>
        <button type="button" onClick={() => dispatch('again', true)} className="reader-icon-btn" title="Previous match (Shift+Enter)">
          <ChevronUp className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => dispatch('again')} className="reader-icon-btn" title="Next match (Enter)">
          <ChevronDown className="h-4 w-4" />
        </button>
        <button type="button" onClick={onClose} className="reader-icon-btn" title="Close (Esc)">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 border-t border-[var(--line)] px-2 py-2">
        {(
          [
            ['highlightAll', 'Highlight all'],
            ['caseSensitive', 'Match case'],
            ['entireWord', 'Whole words'],
            ['matchDiacritics', 'Diacritics'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={options[key]}
            onClick={() => toggle(key)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset transition-colors ${
              options[key]
                ? 'bg-[var(--accent)] text-[var(--ink)] ring-[var(--ink)]'
                : 'bg-[var(--soft)] text-[#474747] ring-[var(--line)] hover:bg-[#d0d0d0]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};
