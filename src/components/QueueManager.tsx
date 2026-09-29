import React, { useState } from 'react';
import { AnimatePresence, Reorder, useDragControls } from 'motion/react';
import {
  ChevronUp,
  ChevronDown,
  RotateCw,
  Trash2,
  Copy,
  ArrowUpDown,
  Maximize2,
  Plus,
  Crop,
  Scissors,
  GripVertical,
  Loader2,
} from 'lucide-react';
import { ImageItem } from '../types';
import { normalizeRotation, rotatedSize } from '../utils/layout';

interface QueueManagerProps {
  items: ImageItem[];
  busy?: boolean;
  onRemove: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRotate: (id: string) => void;
  onDuplicate: (id: string) => void;
  onClearAll: () => void;
  onReverse: () => void;
  onOpenAddModal: () => void;
  onPreviewItem: (item: ImageItem) => void;
  onCropItem: (item: ImageItem) => void;
  onReorder: (newItems: ImageItem[]) => void;
  onApplyGlobalCrop: (percentage: number) => void;
}

const iconButton =
  'p-1.5 sm:p-2 text-[#474747] hover:text-[#313033] hover:bg-[#daf200]/50 rounded-full transition-colors inline-flex';

interface QueueItemProps {
  item: ImageItem;
  index: number;
  count: number;
  props: QueueManagerProps;
}

// Dragging starts only from the grip, so swiping the list on a phone scrolls it instead of reordering.
const QueueItem: React.FC<QueueItemProps> = ({ item, index, count, props }) => {
  const controls = useDragControls();
  const rot = normalizeRotation(item.rotation);
  const shown = rotatedSize(item.width, item.height, rot);

  return (
    <Reorder.Item
      layout
      value={item}
      dragListener={false}
      dragControls={controls}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      data-testid="queue-item"
      className="bg-[#f4f4f1] border border-[#b8b8b8] hover:border-[var(--charcoal)]/40 rounded-2xl p-2 sm:p-3 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-shadow duration-150 group"
    >
      {/* Left info & preview */}
      <div className="flex items-center gap-2 sm:gap-3.5 overflow-hidden flex-1 min-w-0">
        <button
          type="button"
          aria-label="Drag to reorder"
          title="Drag to reorder"
          onPointerDown={(e) => controls.start(e)}
          className="hidden sm:inline-flex p-1 text-[#666666] hover:text-[#313033] cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Sequence reorder buttons */}
        <div className="flex flex-col gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => props.onMoveUp(index)}
            disabled={index === 0}
            title="Move up"
            className="p-1 text-[#474747] hover:text-[#313033] hover:bg-[#daf200]/50 rounded-full disabled:opacity-20 transition-colors"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => props.onMoveDown(index)}
            disabled={index === count - 1}
            title="Move down"
            className="p-1 text-[#474747] hover:text-[#313033] hover:bg-[#daf200]/50 rounded-full disabled:opacity-20 transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Thumbnail */}
        <button
          type="button"
          onClick={() => props.onPreviewItem(item)}
          title="Preview image"
          className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#dedede] overflow-hidden flex-shrink-0 border border-[#b8b8b8] cursor-pointer group/thumb shadow-inner flex items-center justify-center"
        >
          <img
            src={item.previewUrl}
            alt={item.name}
            style={{ transform: `rotate(${rot}deg)` }}
            className="w-full h-full object-cover transition-transform duration-200 pointer-events-none"
          />
          <div className="absolute inset-0 bg-[var(--charcoal)]/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white transition-opacity">
            <Maximize2 className="w-3.5 h-3.5" />
          </div>
        </button>

        {/* Details */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-[#151515] truncate">
              {index + 1}. {item.name}
            </span>
            {rot !== 0 && (
              <span className="text-[10px] font-mono font-semibold text-[#001D35] bg-[#daf200] px-2 py-0.5 rounded-full shrink-0">
                {rot}°
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#474747] font-mono mt-0.5 truncate">
            <span>{(item.size / 1024 / 1024).toFixed(2)} MB</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">{shown.width} × {shown.height}px</span>
          </div>
        </div>
      </div>

      {/* Actions per item */}
      <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0 ml-1 sm:ml-2">
        <button type="button" onClick={() => props.onCropItem(item)} title="Crop image" className={iconButton}>
          <Crop className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => props.onRotate(item.id)} title="Rotate 90° Clockwise" className={iconButton}>
          <RotateCw className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => props.onDuplicate(item.id)} title="Duplicate image" className={iconButton}>
          <Copy className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => props.onRemove(item.id)}
          title="Remove from queue"
          className="p-1.5 sm:p-2 text-[#474747] hover:text-[#d32f2f] hover:bg-[#ffcdd2]/50 rounded-full transition-colors inline-flex"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </Reorder.Item>
  );
};

export const QueueManager: React.FC<QueueManagerProps> = (props) => {
  const { items, busy, onClearAll, onReverse, onOpenAddModal, onReorder, onApplyGlobalCrop } = props;
  const [globalCropPercent, setGlobalCropPercent] = useState<number>(0);
  const totalSizeBytes = items.reduce((acc, curr) => acc + curr.size, 0);
  const totalSizeMb = (totalSizeBytes / (1024 * 1024)).toFixed(2);

  return (
    <div className="space-y-4">
      {/* M3 Action Toolbar Header */}
      <div className="flex flex-col gap-4 pb-3 border-b border-[#b8b8b8]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-sm font-bold text-[#151515]">
              Image Staging: Cropping & Reordering ({items.length} {items.length === 1 ? 'item' : 'items'})
            </span>
            <span className="editorial-chip py-1 px-2.5 bg-[#dedede] text-[#474747] font-mono text-xs border-none font-medium">
              Total {totalSizeMb} MB
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onReverse}
              title="Reverse image sequence"
              className="editorial-btn editorial-btn-outlined text-xs py-1.5 px-3 h-8 gap-1.5 border-[#aaa] text-[#474747] hover:text-[#313033] flex-1 sm:flex-none justify-center"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#313033]" />
              <span className="hidden sm:inline">Reverse Sequence</span>
            </button>

            <button
              type="button"
              onClick={onOpenAddModal}
              className="editorial-btn editorial-btn-tonal text-xs py-1.5 px-3 h-8 text-[#151515] bg-[#daf200] hover:bg-[#C2D7FA] flex-1 sm:flex-none justify-center"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add More</span>
            </button>

            <button
              type="button"
              onClick={onClearAll}
              title="Clear all"
              className="editorial-btn text-xs py-1.5 px-3 h-8 text-[#d32f2f] hover:bg-[#ffcdd2]/50 flex-none justify-center"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear All</span>
            </button>
          </div>
        </div>

        {/* Global Crop Tool */}
        <div className="bg-[#e0e0e0]/40 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#151515]">
            <Scissors className="w-4 h-4 text-[#313033]" />
            <span>Crop sticky headers (Top %):</span>
          </div>
          <div className="flex-1 flex items-center gap-3 w-full">
            <input
              type="range"
              min="0"
              max="30"
              value={globalCropPercent}
              aria-label="Top crop percentage"
              onChange={(e) => setGlobalCropPercent(Number(e.target.value))}
              className="w-full h-1.5 bg-[#b8b8b8] rounded-lg appearance-none cursor-pointer accent-[#0B57D0]"
            />
            <span className="text-xs font-mono font-medium text-[#474747] w-8">{globalCropPercent}%</span>
            <button
              type="button"
              onClick={() => {
                onApplyGlobalCrop(globalCropPercent);
                setGlobalCropPercent(0);
              }}
              disabled={globalCropPercent === 0 || busy}
              className="editorial-btn editorial-btn-dark py-1.5 px-3 text-xs h-7 disabled:opacity-50 whitespace-nowrap"
            >
              {busy && <Loader2 className="w-3 h-3 animate-spin" />}
              Apply to All
            </button>
          </div>
        </div>
      </div>

      {/* M3 Item List */}
      <Reorder.Group axis="y" values={items} onReorder={onReorder} className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {items.map((item, index) => (
            <QueueItem key={item.id} item={item} index={index} count={items.length} props={props} />
          ))}
        </AnimatePresence>
      </Reorder.Group>
    </div>
  );
};
