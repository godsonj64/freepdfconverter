import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckSquare, FileJson, Search, Square, TextCursorInput } from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { currentValue, formatValue, isFilled, type FormField } from '../forms';

interface FieldsPanelProps {
  doc: PDFDocumentProxy;
  fields: FormField[];
  /** Bumped whenever a field value changes, so the list re-reads storage. */
  formVersion: number;
  onJump: (field: FormField) => void;
  onExport: () => void;
}

type Filter = 'all' | 'filled' | 'empty';

export const FieldsPanel: React.FC<FieldsPanelProps> = ({ doc, fields, formVersion, onJump, onExport }) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const rows = useMemo(
    () =>
      fields
        .filter((field) => field.kind !== 'button')
        .map((field) => {
          const value = currentValue(doc, field);
          return { field, value, filled: isFilled(field, value) };
        }),
    // formVersion is the signal that storage changed underneath us.
    [doc, fields, formVersion],
  );

  const filledCount = rows.filter((r) => r.filled).length;
  const unsavable = rows.filter((r) => !r.field.savable).length;
  const needle = query.trim().toLowerCase();
  const visible = rows.filter(
    (r) =>
      (filter === 'all' || (filter === 'filled') === r.filled) &&
      (!needle || r.field.label.toLowerCase().includes(needle) || r.field.name.toLowerCase().includes(needle)),
  );

  if (rows.length === 0) {
    return <p className="px-4 py-6 text-sm text-[#555]">This document has no fillable form fields.</p>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b border-[var(--line)] p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-bold text-[#474747]">
            {filledCount} of {rows.length} completed
          </div>
          <button type="button" onClick={onExport} className="reader-chip-btn" title="Export field values as JSON">
            <FileJson className="h-3.5 w-3.5" /> Export
          </button>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[#cfcfcf]">
          <div
            className="h-full rounded-full bg-[var(--charcoal)] transition-all"
            style={{ width: `${(filledCount / rows.length) * 100}%` }}
          />
        </div>
        {unsavable > 0 && (
          <p className="flex gap-2 rounded-lg bg-amber-50 p-2 text-[11px] leading-snug text-amber-900">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
            <span>
              {unsavable} field{unsavable > 1 ? 's aren’t' : ' isn’t'} linked to this form’s data, so{' '}
              {unsavable > 1 ? 'their values' : 'its value'} can’t be written into a saved PDF. They still print and
              export. Use Print → Save as PDF to keep a complete filled copy.
            </span>
          </p>
        )}
        <label className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-[#777]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter fields"
            aria-label="Filter fields"
            className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
          />
        </label>
        <div className="editorial-segmented w-full">
          {(['all', 'filled', 'empty'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`editorial-segmented-item flex-1 justify-center px-2 py-1 text-xs capitalize ${filter === f ? 'active' : ''}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {visible.map(({ field, value, filled }) => {
          const Icon =
            field.kind === 'checkbox' || field.kind === 'radio' ? (filled ? CheckSquare : Square) : TextCursorInput;
          const shown = field.kind === 'checkbox' || field.kind === 'radio' ? '' : formatValue(field, value);
          return (
            <li key={field.id}>
              <button
                type="button"
                onClick={() => onJump(field)}
                title={field.name}
                className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left hover:bg-[#d0d0d0]"
              >
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${filled ? 'text-[var(--ink)]' : 'text-[#999]'}`} />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[13px] font-medium leading-snug">{field.label}</span>
                  {shown && <span className="mt-0.5 block truncate text-xs text-[#555]">{shown}</span>}
                  {field.readOnly && <span className="mt-0.5 block text-[11px] text-[#777]">Read-only</span>}
                  {!field.savable && <span className="mt-0.5 block text-[11px] text-amber-800">Print/export only</span>}
                </span>
                <span className="shrink-0 rounded-full bg-[var(--soft)] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-[#555]">
                  p{field.page}
                </span>
              </button>
            </li>
          );
        })}
        {visible.length === 0 && <li className="px-2 py-4 text-sm text-[#555]">No fields match.</li>}
      </ul>
    </div>
  );
};
