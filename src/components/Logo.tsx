import React from 'react';

/**
 * The FreePDFConverter mark: a page made of two screenshots joined flush,
 * with the lower one running off the edge. One continuous page, no break.
 * The page spans exactly the tile's straight bottom edge, so no clip path is
 * needed. Keep in sync with public/favicon.svg.
 */
export const LogoMark: React.FC<{ size?: number; className?: string; title?: string }> = ({
  size = 36,
  className,
  title,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 64 64"
    width={size}
    height={size}
    className={className}
    role={title ? 'img' : undefined}
    aria-label={title}
    aria-hidden={title ? undefined : true}
  >
    <rect width="64" height="64" rx="15" fill="#313033" />
    <path d="M15 9h23l11 11v44H15z" fill="#f4f4f1" />
    <path d="M38 9v11h11z" fill="#daf200" />
    <rect x="20" y="25" width="24" height="3.5" rx="1.75" fill="#313033" />
    <rect x="20" y="31" width="16" height="3.5" rx="1.75" fill="#313033" />
    <path d="M15 41h34v23H15z" fill="#daf200" />
    <rect x="20" y="46" width="24" height="3.5" rx="1.75" fill="#313033" />
    <rect x="20" y="52" width="19" height="3.5" rx="1.75" fill="#313033" />
  </svg>
);

/** Mark plus wordmark, with "PDF" set in the accent block used by the hero headline. */
export const Logo: React.FC<{ size?: number; className?: string; wordmarkClassName?: string }> = ({
  size = 36,
  className = '',
  wordmarkClassName = 'text-lg sm:text-xl',
}) => (
  <span className={`inline-flex items-center gap-2.5 min-w-0 ${className}`}>
    <LogoMark size={size} className="shrink-0" />
    <span className={`font-extrabold tracking-tight text-[var(--ink)] whitespace-nowrap truncate ${wordmarkClassName}`}>
      Free
      <span className="mx-[0.12em] px-[0.22em] rounded-[0.2em] bg-[var(--accent)] text-[var(--ink)]">PDF</span>
      Converter
    </span>
  </span>
);
