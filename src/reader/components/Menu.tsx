import React, { useEffect, useRef, useState } from 'react';

interface MenuProps {
  label: string;
  icon: React.ReactNode;
  text?: string;
  align?: 'left' | 'right';
  disabled?: boolean;
  children: (close: () => void) => React.ReactNode;
}

/** Minimal accessible popover menu for the reader toolbar. */
export const Menu: React.FC<MenuProps> = ({ label, icon, text, align = 'right', disabled, children }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        aria-label={label}
        onClick={() => setOpen(!open)}
        className={text ? 'reader-chip-btn h-8' : 'reader-icon-btn'}
      >
        {icon}
        {text && <span className="hidden xl:inline">{text}</span>}
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute top-full z-50 mt-1.5 w-64 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-1.5 shadow-xl ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
};

export const MenuItem: React.FC<{
  icon?: React.ReactNode;
  label: string;
  hint?: string;
  checked?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}> = ({ icon, label, hint, checked, disabled, onSelect }) => (
  <button
    type="button"
    role={checked === undefined ? 'menuitem' : 'menuitemradio'}
    aria-checked={checked}
    disabled={disabled}
    onClick={onSelect}
    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
      checked ? 'bg-[var(--accent)] text-[var(--ink)]' : 'hover:bg-[var(--soft)]'
    }`}
  >
    <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[#474747]">{icon}</span>
    <span className="min-w-0 flex-1">
      <span className="block">{label}</span>
      {hint && <span className="block text-[11px] font-medium text-[#666]">{hint}</span>}
    </span>
  </button>
);

export const MenuSeparator: React.FC<{ label?: string }> = ({ label }) =>
  label ? (
    <div className="px-2.5 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-wider text-[#777]">{label}</div>
  ) : (
    <div className="my-1 h-px bg-[var(--line)]" />
  );
