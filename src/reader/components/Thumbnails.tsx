import React, { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { pdfjsLib } from '../pdfjs';
import { SimpleLinkService } from '../viewer';

const THUMB_WIDTH = 132;

interface ThumbnailsProps {
  doc: PDFDocumentProxy;
  currentPage: number;
  rotation: number;
  /** Bumped when form values change so XFA previews can redraw filled fields. */
  formVersion: number;
  onSelect: (pageNumber: number) => void;
}

export const Thumbnails: React.FC<ThumbnailsProps> = ({ doc, currentPage, rotation, formVersion, onSelect }) => {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-thumb="${currentPage}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [currentPage]);

  return (
    <div ref={listRef} className="flex flex-col items-center gap-4 px-3 py-4">
      {Array.from({ length: doc.numPages }, (_, i) => (
        <Thumbnail
          key={i}
          doc={doc}
          pageNumber={i + 1}
          active={currentPage === i + 1}
          rotation={rotation}
          formVersion={doc.isPureXfa ? formVersion : 0}
          scrollRoot={listRef}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};

interface ThumbnailProps {
  doc: PDFDocumentProxy;
  pageNumber: number;
  active: boolean;
  rotation: number;
  formVersion: number;
  scrollRoot: React.RefObject<HTMLDivElement | null>;
  onSelect: (pageNumber: number) => void;
}

const Thumbnail: React.FC<ThumbnailProps> = ({ doc, pageNumber, active, rotation, formVersion, scrollRoot, onSelect }) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [size, setSize] = useState({ width: THUMB_WIDTH, height: Math.round(THUMB_WIDTH * 1.294) });

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { root: scrollRoot.current?.parentElement ?? null, rootMargin: '400px 0px' },
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, [scrollRoot]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!visible || !frame) return;
    let cancelled = false;
    let renderTask: RenderTask | null = null;

    (async () => {
      const page = await doc.getPage(pageNumber);
      if (cancelled) return;
      const totalRotation = (page.rotate + rotation) % 360;
      const base = page.getViewport({ scale: 1, rotation: totalRotation });
      const scale = THUMB_WIDTH / base.width;
      const viewport = page.getViewport({ scale, rotation: totalRotation });
      setSize({ width: Math.round(viewport.width), height: Math.round(viewport.height) });

      if (page.isPureXfa) {
        const xfaHtml = await page.getXfa();
        if (cancelled || !xfaHtml) return;
        const layer = document.createElement('div');
        pdfjsLib.XfaLayer.render({
          viewport: page.getViewport({ scale, rotation: totalRotation, dontFlip: true }),
          div: layer,
          xfaHtml,
          annotationStorage: doc.annotationStorage,
          linkService: new SimpleLinkService(),
          intent: 'print',
        });
        frame.replaceChildren(layer);
        return;
      }

      const outputScale = Math.min(window.devicePixelRatio || 1, 2);
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      renderTask = page.render({
        canvas,
        viewport,
        transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
      });
      await renderTask.promise;
      if (!cancelled) frame.replaceChildren(canvas);
    })().catch((error) => {
      if (error?.name !== 'RenderingCancelledException') console.warn(`Thumbnail ${pageNumber}:`, error);
    });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [doc, pageNumber, rotation, visible, formVersion]);

  return (
    <button
      type="button"
      data-thumb={pageNumber}
      onClick={() => onSelect(pageNumber)}
      aria-current={active ? 'page' : undefined}
      aria-label={`Page ${pageNumber}`}
      className="group flex flex-col items-center gap-1.5 outline-none"
    >
      <div
        ref={frameRef}
        inert
        style={{ width: size.width, height: size.height }}
        className={`reader-thumb relative overflow-hidden bg-white shadow-sm ring-offset-2 ring-offset-[var(--soft)] transition ${
          active ? 'ring-2 ring-[var(--ink)]' : 'ring-1 ring-[var(--line)] group-hover:ring-[var(--charcoal)] group-focus-visible:ring-2'
        }`}
      />
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
          active ? 'bg-[var(--accent)] text-[var(--ink)]' : 'text-[#555]'
        }`}
      >
        {pageNumber}
      </span>
    </button>
  );
};
