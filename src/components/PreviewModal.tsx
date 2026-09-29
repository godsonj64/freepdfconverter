import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Download,
  Printer,
  ZoomIn,
  ZoomOut,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { ImageItem } from '../types';
import { Document, Page, pdfjs } from 'react-pdf';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// Bundle the worker with the app so the preview does not depend on a third-party CDN.
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const BASE_PAGE_WIDTH = 700;

interface PreviewModalProps {
  onClose: () => void;
  pdfUrl: string | null;
  dimensionsText: string;
  fileName: string;
  onDownloadPdf: () => void;
  onDownloadPng: () => void;
  singleImageItem?: ImageItem | null;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  onClose,
  pdfUrl,
  dimensionsText,
  fileName,
  onDownloadPdf,
  onDownloadPng,
  singleImageItem,
}) => {
  const [zoom, setZoom] = useState(100);
  const [numPages, setNumPages] = useState(0);
  const [frameWidth, setFrameWidth] = useState(BASE_PAGE_WIDTH);
  const frameRef = useRef<HTMLDivElement>(null);

  // Fit pages to the viewer on small screens; zoom changes the render width so scrolling stays correct.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => setFrameWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pageWidth = Math.max(200, Math.min(BASE_PAGE_WIDTH, frameWidth - 32)) * (zoom / 100);

  const handlePrint = () => {
    if (!pdfUrl) return;
    const printWindow = window.open(pdfUrl, '_blank');
    printWindow?.focus();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-[#000000]/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label={singleImageItem ? 'Image preview' : 'PDF preview'}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-5xl h-[92vh] sm:h-[88vh] bg-[#f4f4f1] rounded-2xl sm:rounded-[1.8vw] shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#b8b8b8] flex flex-col overflow-hidden"
      >
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 sm:px-6 py-3 sm:py-4 border-b border-[#b8b8b8] bg-[#f4f4f1]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-[#daf200] flex items-center justify-center text-[#313033] shadow-xs">
              <FileText className="w-5 h-5 text-[#313033]" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-[#151515] text-sm sm:text-base truncate">
                {singleImageItem ? singleImageItem.name : fileName}
              </h3>
              <p className="text-xs text-[#474747] font-mono truncate">
                {singleImageItem
                  ? `${singleImageItem.width} × ${singleImageItem.height}px • ${(singleImageItem.size / 1024 / 1024).toFixed(2)} MB`
                  : dimensionsText}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto w-full sm:w-auto justify-end">
            {!singleImageItem && (
              <>
                <div className="flex items-center gap-1 bg-[#f4f4f1] border border-[#aaa] rounded-full p-1 mr-1 sm:mr-2 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(50, z - 25))}
                    className="p-1 text-[#474747] hover:text-[#313033] rounded-full hover:bg-[#daf200]/40 transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono font-semibold text-[#151515] px-2 min-w-[40px] text-center">
                    {zoom}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(200, z + 25))}
                    className="p-1 text-[#474747] hover:text-[#313033] rounded-full hover:bg-[#daf200]/40 transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="editorial-btn editorial-btn-outlined py-1.5 px-3 text-xs border-[#aaa] text-[#474747] hover:text-[#313033] hidden md:inline-flex"
                  title="Open the PDF in a new tab to print it"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print</span>
                </button>

                <button
                  type="button"
                  onClick={onDownloadPng}
                  className="editorial-btn editorial-btn-tonal py-1.5 px-3 text-xs text-[#151515] bg-[#daf200] hover:bg-[#C2D7FA] flex-1 sm:flex-none justify-center"
                  title="Download Combined PNG"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-[#313033] flex-shrink-0" />
                  <span className="truncate">PNG</span>
                </button>

                <button
                  type="button"
                  onClick={onDownloadPdf}
                  className="editorial-btn editorial-btn-dark py-1.5 px-3 text-xs shadow-sm flex-1 sm:flex-none justify-center"
                >
                  <Download className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">PDF</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="p-2 text-[#474747] hover:text-[#151515] hover:bg-[#dedede] rounded-full transition-colors ml-1 cursor-pointer flex-shrink-0 bg-white sm:bg-transparent shadow-sm sm:shadow-none border border-[#aaa] sm:border-transparent"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Main Document Viewer Frame */}
        <div ref={frameRef} className="flex-1 bg-[#dedede] overflow-auto">
          {singleImageItem ? (
            <div className="min-h-full flex items-center justify-center p-4">
              <img
                src={singleImageItem.previewUrl}
                alt={singleImageItem.name}
                style={{ transform: `rotate(${singleImageItem.rotation}deg)` }}
                className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-lg border border-[#b8b8b8] bg-white"
              />
            </div>
          ) : pdfUrl ? (
            <div className="w-max min-w-full flex flex-col items-center py-6 px-4">
              <Document
                file={pdfUrl}
                onLoadSuccess={({ numPages: n }) => setNumPages(n)}
                loading={<div className="text-[#474747] mt-10">Loading PDF preview...</div>}
                error={<div className="text-[#d32f2f] mt-10 font-medium">Preview unavailable. Please download the PDF.</div>}
              >
                {Array.from({ length: numPages }, (_, index) => (
                  <div key={`page_${index + 1}`} className="mb-6 rounded-xl overflow-hidden shadow-xl border border-[#b8b8b8] bg-white">
                    <Page
                      pageNumber={index + 1}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      width={pageWidth}
                    />
                  </div>
                ))}
              </Document>
            </div>
          ) : (
            <div className="text-center text-[#474747] mt-20">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-40 text-[#666666]" />
              <p className="text-sm">Preparing live document preview...</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
