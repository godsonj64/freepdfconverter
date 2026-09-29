import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X, Crop as CropIcon, Loader2 } from 'lucide-react';
import ReactCrop, { Crop, PercentCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { ImageItem } from '../types';
import { bakeItemEdit, canvasToBlob, getProcessedCanvas } from '../utils/imageOps';
import { normalizeRotation } from '../utils/layout';

interface CropModalProps {
  onClose: () => void;
  item: ImageItem;
  onSave: (id: string, edit: Awaited<ReturnType<typeof bakeItemEdit>>) => void;
}

// Mounted fresh per item (keyed by id), so no crop rectangle carries over between images.
export const CropModal: React.FC<CropModalProps> = ({ onClose, item, onSave }) => {
  const [crop, setCrop] = useState<Crop>();
  const [percentCrop, setPercentCrop] = useState<PercentCrop>();
  const [sourceUrl, setSourceUrl] = useState<string | null>(
    normalizeRotation(item.rotation) === 0 ? item.previewUrl : null
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show a rotated image as it appears in the queue, so the crop matches what the user sees.
  useEffect(() => {
    if (normalizeRotation(item.rotation) === 0) return;
    let url: string | null = null;
    let cancelled = false;
    getProcessedCanvas(item)
      .then((canvas) => canvasToBlob(canvas, 'image/png'))
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setSourceUrl(url);
      })
      .catch(() => !cancelled && setError('Could not load this image for cropping.'));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [item]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const hasCrop = !!percentCrop && percentCrop.width > 0 && percentCrop.height > 0;

  const handleSave = async () => {
    if (!hasCrop || !percentCrop) return;
    setSaving(true);
    setError(null);
    try {
      const edit = await bakeItemEdit(item, percentCrop);
      onSave(item.id, edit);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Could not crop this image.');
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--charcoal)]/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Crop image"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-3xl bg-[var(--stage)] rounded-2xl shadow-xl border border-[#b8b8b8] overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-4 border-b border-[#b8b8b8] bg-[#f4f4f1]">
          <div className="flex items-center gap-2 min-w-0">
            <CropIcon className="w-5 h-5 text-[#313033] shrink-0" />
            <h2 className="text-lg font-bold text-[#151515] truncate">Crop Image</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-[#474747] hover:bg-[#e0e0e0] rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-4 flex flex-col items-center justify-center bg-[var(--paper)]">
          {sourceUrl ? (
            // ReactCrop passes its max-height down to the image; set on the image itself it is overridden.
            <ReactCrop
              crop={crop}
              onChange={(pixel, percent) => {
                setCrop(pixel);
                setPercentCrop(percent);
              }}
              style={{ maxHeight: '60vh' }}
            >
              <img src={sourceUrl} alt="Crop preview" className="max-w-full object-contain" />
            </ReactCrop>
          ) : (
            !error && <Loader2 className="w-6 h-6 animate-spin text-[#474747]" />
          )}
          <p className="text-xs text-[#474747] mt-3 text-center">Drag across the image to choose the area to keep.</p>
          {error && <p className="text-xs text-[#d32f2f] mt-2">{error}</p>}
        </div>

        <div className="p-4 border-t border-[#b8b8b8] bg-[#f4f4f1] flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-[#474747] hover:bg-[#e0e0e0] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasCrop || saving}
            className="px-6 py-2 bg-[#0B57D0] hover:bg-[#0B57D0]/90 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 inline-flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Apply Crop
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
