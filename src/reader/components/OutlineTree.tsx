import React, { useState } from 'react';
import { ChevronRight, ExternalLink } from 'lucide-react';

export interface OutlineItem {
  title: string;
  dest: string | unknown[] | null;
  url: string | null;
  bold?: boolean;
  italic?: boolean;
  items: OutlineItem[];
}

interface OutlineTreeProps {
  items: OutlineItem[];
  onNavigate: (item: OutlineItem) => void;
  depth?: number;
}

export const OutlineTree: React.FC<OutlineTreeProps> = ({ items, onNavigate, depth = 0 }) => (
  <ul role={depth === 0 ? 'tree' : 'group'} className="space-y-0.5">
    {items.map((item, i) => (
      <OutlineNode key={`${depth}-${i}`} item={item} depth={depth} onNavigate={onNavigate} />
    ))}
  </ul>
);

const OutlineNode: React.FC<{ item: OutlineItem; depth: number; onNavigate: (item: OutlineItem) => void }> = ({
  item,
  depth,
  onNavigate,
}) => {
  const [open, setOpen] = useState(depth === 0 && item.items.length <= 12);
  const hasChildren = item.items.length > 0;

  return (
    <li role="treeitem" aria-expanded={hasChildren ? open : undefined}>
      <div className="flex items-start gap-0.5" style={{ paddingLeft: depth * 12 }}>
        <button
          type="button"
          tabIndex={hasChildren ? 0 : -1}
          aria-label={open ? 'Collapse' : 'Expand'}
          onClick={() => setOpen(!open)}
          className={`mt-1 shrink-0 rounded p-0.5 text-[#666] hover:bg-[#d0d0d0] ${hasChildren ? '' : 'invisible'}`}
        >
          <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
        </button>
        <button
          type="button"
          onClick={() => onNavigate(item)}
          className={`min-w-0 flex-1 rounded-md px-1.5 py-1 text-left text-[13px] leading-snug hover:bg-[#d0d0d0] ${
            item.bold ? 'font-bold' : 'font-medium'
          } ${item.italic ? 'italic' : ''}`}
        >
          {item.title || 'Untitled'}
          {item.url && <ExternalLink className="ml-1 inline h-3 w-3 align-[-1px] text-[#666]" />}
        </button>
      </div>
      {hasChildren && open && <OutlineTree items={item.items} onNavigate={onNavigate} depth={depth + 1} />}
    </li>
  );
};
