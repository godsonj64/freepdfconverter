import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronUp, 
  ChevronDown, 
  RotateCw, 
  Trash2, 
  Copy, 
  ArrowUpDown, 
  Maximize2,
  Plus
} from 'lucide-react';
import { ImageItem } from '../types';

interface QueueManagerProps {
  items: ImageItem[];
  onRemove: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRotate: (id: string) => void;
  onDuplicate: (id: string) => void;
  onClearAll: () => void;
  onReverse: () => void;
  onOpenAddModal: () => void;
  onPreviewItem: (item: ImageItem) => void;
}

export const QueueManager: React.FC<QueueManagerProps> = ({
  items,
  onRemove,
  onMoveUp,
  onMoveDown,
  onRotate,
  onDuplicate,
  onClearAll,
  onReverse,
  onOpenAddModal,
  onPreviewItem,
}) => {
  const totalSizeBytes = items.reduce((acc, curr) => acc + curr.size, 0);
  const totalSizeMb = (totalSizeBytes / (1024 * 1024)).toFixed(2);

  return (
    <div className="space-y-4">
      {/* M3 Action Toolbar Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#b8b8b8]">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold text-[#151515]">
            Document Queue ({items.length} {items.length === 1 ? 'item' : 'items'})
          </span>
          <span className="editorial-chip py-1 px-2.5 bg-[#dedede] text-[#474747] font-mono text-xs border-none font-medium">
            Total {totalSizeMb} MB
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReverse}
            title="Reverse image sequence"
            className="editorial-btn editorial-btn-outlined text-xs py-1.5 px-3 h-8 gap-1.5 border-[#aaa] text-[#474747] hover:text-[#313033]"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-[#313033]" />
            <span className="hidden sm:inline">Reverse Sequence</span>
          </button>
          
          <button
            type="button"
            onClick={onOpenAddModal}
            className="editorial-btn editorial-btn-tonal text-xs py-1.5 px-3 h-8 text-[#151515] bg-[#daf200] hover:bg-[#C2D7FA]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add More</span>
          </button>

          <button
            type="button"
            onClick={onClearAll}
            className="editorial-btn text-xs py-1.5 px-3 h-8 text-[#d32f2f] hover:bg-[#ffcdd2]/50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear All</span>
          </button>
        </div>
      </div>

      {/* M3 Item List */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
        <AnimatePresence>
          {items.map((item, index) => {
            const rot = (item.rotation % 360 + 360) % 360;
            return (
                <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#f4f4f1] border border-[#b8b8b8] hover:border-[var(--charcoal)]/40 rounded-2xl p-3 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)] transition-all duration-150 group"
              >
                {/* Left info & preview */}
                <div className="flex items-center gap-3.5 overflow-hidden flex-1 min-w-0">
                  {/* Sequence reorder buttons */}
                  <div className="flex flex-col gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => onMoveUp(index)}
                      disabled={index === 0}
                      title="Move up"
                      className="p-1 text-[#474747] hover:text-[#313033] hover:bg-[#daf200]/50 rounded-full disabled:opacity-20 transition-colors"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveDown(index)}
                      disabled={index === items.length - 1}
                      title="Move down"
                      className="p-1 text-[#474747] hover:text-[#313033] hover:bg-[#daf200]/50 rounded-full disabled:opacity-20 transition-colors"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Thumbnail */}
                  <div 
                    onClick={() => onPreviewItem(item)}
                    className="relative w-12 h-12 rounded-xl bg-[#dedede] overflow-hidden flex-shrink-0 border border-[#b8b8b8] cursor-pointer group/thumb shadow-inner flex items-center justify-center"
                  >
                    <img
                      src={item.previewUrl}
                      alt={item.name}
                      style={{ transform: `rotate(${rot}deg)` }}
                      className="w-full h-full object-cover transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-[var(--charcoal)]/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white transition-opacity">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#151515] truncate max-w-[220px] sm:max-w-[280px]">
                        {index + 1}. {item.name}
                      </span>
                      {rot !== 0 && (
                        <span className="text-[10px] font-mono font-semibold text-[#001D35] bg-[#daf200] px-2 py-0.5 rounded-full">
                          {rot}°
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#474747] font-mono mt-0.5">
                      <span>{(item.size / 1024 / 1024).toFixed(2)} MB</span>
                      <span>•</span>
                      <span>{item.width} × {item.height}px</span>
                    </div>
                  </div>
                </div>

                {/* Actions per item */}
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => onRotate(item.id)}
                    title="Rotate 90° Clockwise"
                    className="p-2 text-[#474747] hover:text-[#313033] hover:bg-[#daf200]/50 rounded-full transition-colors"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDuplicate(item.id)}
                    title="Duplicate image"
                    className="p-2 text-[#474747] hover:text-[#313033] hover:bg-[#daf200]/50 rounded-full transition-colors hidden sm:inline-flex"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    title="Remove from queue"
                    className="p-2 text-[#474747] hover:text-[#d32f2f] hover:bg-[#ffcdd2]/50 rounded-full transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
