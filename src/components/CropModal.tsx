import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Crop as CropIcon } from 'lucide-react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { ImageItem } from '../types';

interface CropModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ImageItem | null;
  onSave: (id: string, newBlob: Blob, newPreviewUrl: string) => void;
}

export const CropModal: React.FC<CropModalProps> = ({
  isOpen,
  onClose,
  item,
  onSave
}) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  const handleSave = () => {
    if (!completedCrop || !imgRef.current || !item) return;

    const canvas = document.createElement('canvas');
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY
    );

    canvas.toBlob((blob) => {
      if (!blob) return;
      const newPreviewUrl = URL.createObjectURL(blob);
      onSave(item.id, blob, newPreviewUrl);
      onClose();
    }, item.file.type || 'image/png', 1);
  };

  if (!item) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--charcoal)]/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-3xl bg-[var(--stage)] rounded-2xl shadow-xl border border-[#b8b8b8] overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between p-4 border-b border-[#b8b8b8] bg-[#f4f4f1]">
              <div className="flex items-center gap-2">
                <CropIcon className="w-5 h-5 text-[#313033]" />
                <h2 className="text-lg font-bold text-[#151515]">Crop Image</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-[#474747] hover:bg-[#e0e0e0] rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 flex flex-col items-center justify-center bg-[var(--paper)] min-h-[300px]">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
              >
                <img
                  ref={imgRef}
                  src={item.previewUrl}
                  alt="Crop preview"
                  className="max-w-full max-h-[60vh] object-contain"
                />
              </ReactCrop>
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
                disabled={!completedCrop?.width || !completedCrop?.height}
                className="px-6 py-2 bg-[#0B57D0] hover:bg-[#0B57D0]/90 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                Apply Crop
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
