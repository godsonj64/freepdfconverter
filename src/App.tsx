/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import {
  Upload,
  ArrowRight,
  Layers,
  Loader2,
  Globe,
  Link as LinkIcon,
  Eye,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  Laptop,
  Tablet,
  Smartphone,
  Sun,
  Moon,
  Download,
  FileImage,
  Plus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { QueueManager } from './components/QueueManager';
import { SettingsPanel } from './components/SettingsPanel';
import { FeatureShowcase } from './components/FeatureShowcase';
import { FAQSection } from './components/FAQSection';
import { MissionStatement } from './components/MissionStatement';
import { Footer } from './components/Footer';
import { ImageItem, ConversionSettings } from './types';
import { bakeItemEdit, downloadBlob, generateStitchedPng, loadImage } from './utils/imageOps';
import { isSupportedImage, sanitizeFileName, SUPPORTED_MIME_TYPES } from './utils/layout';
import { captureWebsite, normalizeCaptureUrl, ColorScheme, ViewportDevice } from './utils/webCapture';

// The PDF viewer, cropper and PDF writer are large; load them only when used.
const PreviewModal = lazy(() => import('./components/PreviewModal').then((m) => ({ default: m.PreviewModal })));
const CropModal = lazy(() => import('./components/CropModal').then((m) => ({ default: m.CropModal })));
const loadPdfEngine = () => import('./utils/pdfEngine');

type Busy = null | 'pdf' | 'preview' | 'png' | 'crop';
type Toast = { id: number; message: string; tone: 'success' | 'error' };

const CAPTURE_TIMEOUT_MS = 90_000;

function makeId(name: string) {
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
  return `${name}-${rand}`;
}

function hasFiles(e: DragEvent) {
  return !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

export default function App() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');

  // URL capture states
  const [urlInput, setUrlInput] = useState('');
  const [viewport, setViewport] = useState<ViewportDevice>('desktop');
  const [colorScheme, setColorScheme] = useState<ColorScheme>('light');
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStatus, setCaptureStatus] = useState('');
  const [captureError, setCaptureError] = useState<string | null>(null);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ConversionSettings>({
    layoutMode: 'continuous',
    margin: 'none',
    quality: 'maximum',
    background: 'white',
    fileName: 'freepdfconverter-document',
    showPageNumbers: false,
    addTimestamp: false,
  });

  // Modal states
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPdf, setPreviewPdf] = useState<{ blob: Blob; url: string; dimensionsText: string } | null>(null);
  const [activePreviewItem, setActivePreviewItem] = useState<ImageItem | null>(null);
  const [activeCropItem, setActiveCropItem] = useState<ImageItem | null>(null);

  const [toast, setToast] = useState<Toast | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const showToast = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setToast({ id, message, tone });
    setTimeout(() => setToast((prev) => (prev?.id === id ? null : prev)), tone === 'error' ? 6000 : 3500);
  }, []);

  const pdfFileName = `${sanitizeFileName(settings.fileName)}.pdf`;
  const pngFileName = `${sanitizeFileName(settings.fileName)}-stitched.png`;

  // Reads files into queue items. Unsupported or undecodable files are reported, not silently dropped.
  const addFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      const supported = files.filter(isSupportedImage);
      const loaded = await Promise.all(
        supported.map(async (file): Promise<ImageItem | null> => {
          const previewUrl = URL.createObjectURL(file);
          try {
            const img = await loadImage(previewUrl);
            return {
              id: makeId(file.name),
              file,
              previewUrl,
              name: file.name,
              size: file.size,
              width: img.naturalWidth || 1200,
              height: img.naturalHeight || 800,
              rotation: 0,
            };
          } catch {
            URL.revokeObjectURL(previewUrl);
            return null;
          }
        })
      );
      const added = loaded.filter((item): item is ImageItem => item !== null);
      const rejected = files.length - added.length;

      if (added.length > 0) setItems((prev) => [...prev, ...added]);

      if (added.length > 0 && rejected === 0) {
        showToast(`Added ${added.length} image${added.length !== 1 ? 's' : ''} to queue`);
      } else if (added.length > 0) {
        showToast(`Added ${added.length}, skipped ${rejected} file${rejected !== 1 ? 's' : ''} that aren't supported images`, 'error');
      } else {
        showToast('Those files are not supported. Use PNG, JPG, WebP, GIF, SVG or BMP images.', 'error');
      }
    },
    [showToast]
  );

  // Paste (Ctrl+V / Cmd+V) and drag & drop anywhere on the page.
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const target = e.target as HTMLElement | null;
      const imageFiles: File[] = [];
      for (const item of Array.from(e.clipboardData.items)) {
        if (!item.type.startsWith('image/')) continue;
        const blob = item.getAsFile();
        if (!blob) continue;
        const ext = blob.type.split('/')[1]?.replace('jpeg', 'jpg').replace('svg+xml', 'svg') || 'png';
        imageFiles.push(
          new File([blob], `clipboard-screenshot-${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`, {
            type: blob.type || 'image/png',
          })
        );
      }
      // Let text paste into inputs work normally.
      if (imageFiles.length === 0 && target?.closest('input, textarea')) return;
      if (imageFiles.length > 0) {
        e.preventDefault();
        setActiveTab('upload');
        void addFiles(imageFiles);
      }
    };

    // Without these, dropping a file outside the drop zone makes the browser
    // navigate to the image and throw the whole queue away.
    const handleDragEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      dragDepth.current += 1;
      setIsDragging(true);
    };
    const handleDragOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };
    const handleDragLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setIsDragging(false);
    };
    const handleDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current = 0;
      setIsDragging(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length > 0) {
        setActiveTab('upload');
        void addFiles(files);
      }
    };

    window.addEventListener('paste', handlePaste);
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [addFiles]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    await addFiles(files);
  };

  const replaceItem = (id: string, patch: Partial<ImageItem>) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        if (patch.previewUrl && patch.previewUrl !== it.previewUrl) URL.revokeObjectURL(it.previewUrl);
        return { ...it, ...patch };
      })
    );
  };

  // Global crop tool: trims the top of every image as it appears on screen (rotation included).
  const applyGlobalTopCrop = async (cropPercentage: number) => {
    if (cropPercentage <= 0 || items.length === 0) return;
    setBusy('crop');
    try {
      for (const item of items) {
        const edit = await bakeItemEdit(item, { x: 0, y: cropPercentage, width: 100, height: 100 - cropPercentage });
        replaceItem(item.id, edit);
      }
      showToast(`Cropped the top ${cropPercentage}% off all images`);
    } catch (err) {
      console.error(err);
      showToast(errorMessage(err, 'Failed to crop images.'), 'error');
    } finally {
      setBusy(null);
    }
  };

  // Queue manipulation functions
  const removeItem = (id: string) => {
    setItems((prev) => {
      const itemToRemove = prev.find((i) => i.id === id);
      if (itemToRemove) URL.revokeObjectURL(itemToRemove.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const moveItem = (index: number, delta: -1 | 1) => {
    setItems((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  };

  const rotateItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, rotation: (item.rotation + 90) % 360 } : item))
    );
  };

  const duplicateItem = (id: string) => {
    setItems((prev) => {
      const index = prev.findIndex((i) => i.id === id);
      if (index === -1) return prev;
      const item = prev[index];
      // Each copy needs its own object URL: removing or cropping one revokes its URL.
      const duplicated: ImageItem = {
        ...item,
        id: makeId(item.name),
        previewUrl: URL.createObjectURL(item.file),
        name: item.name.replace(/(\.[^./]+)?$/, ' (copy)$1'),
      };
      return [...prev.slice(0, index + 1), duplicated, ...prev.slice(index + 1)];
    });
    showToast('Duplicated image');
  };

  const clearAllItems = () => {
    items.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    setItems([]);
    showToast('Queue cleared');
  };

  const reverseItems = () => {
    setItems((prev) => [...prev].reverse());
    showToast('Reversed image sequence');
  };

  // Web capture handler
  const handleCaptureUrl = async (presetUrl?: string) => {
    if (isCapturing) return;
    const cleanUrl = normalizeCaptureUrl(presetUrl ?? urlInput);
    if (!cleanUrl) {
      setCaptureError('Enter a public website address, for example https://example.com');
      return;
    }

    setIsCapturing(true);
    setCaptureError(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CAPTURE_TIMEOUT_MS);

    try {
      const file = await captureWebsite(cleanUrl, viewport, colorScheme, {
        signal: controller.signal,
        onStatus: setCaptureStatus,
      });
      await addFiles([file]);
      setUrlInput('');
      setActiveTab('upload');
      showToast(`Captured ${new URL(cleanUrl).hostname.replace(/^www\./, '')}`);
    } catch (error) {
      console.error(error);
      setCaptureError(errorMessage(error, 'Could not capture that page.'));
    } finally {
      clearTimeout(timer);
      setIsCapturing(false);
      setCaptureStatus('');
    }
  };

  // Generate Sample Demo Data
  const loadDemoSamples = async () => {
    const createSampleCanvas = (title: string, color1: string, color2: string, height: number) => {
      const c = document.createElement('canvas');
      c.width = 1200;
      c.height = height;
      const ctx = c.getContext('2d');
      if (ctx) {
        const card = (x: number, y: number, w: number, h: number, r: number) => {
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
          else ctx.rect(x, y, w, h);
          ctx.fill();
        };
        const grad = ctx.createLinearGradient(0, 0, 1200, height);
        grad.addColorStop(0, color1);
        grad.addColorStop(1, color2);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1200, height);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
        card(80, 60, 1040, 120, 24);

        ctx.fillStyle = '#041E49';
        ctx.font = 'bold 36px Roboto, sans-serif';
        ctx.fillText(title, 120, 135);

        for (let y = 220; y < height - 100; y += 180) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
          card(80, y, 1040, 140, 20);

          ctx.fillStyle = '#1F1F1F';
          ctx.font = '22px Roboto, sans-serif';
          ctx.fillText('• Verified continuous ledger entry and scrolling transaction item', 120, y + 60);
          ctx.fillStyle = '#444746';
          ctx.font = '16px Roboto, sans-serif';
          ctx.fillText('Timestamp: 10:42 AM • Status: Complete • Hash #8492048', 120, y + 100);
        }
      }
      return new Promise<Blob | null>((resolve) => c.toBlob(resolve, 'image/png'));
    };

    const blob1 = await createSampleCanvas('Order Summary & Invoice #4092', '#313033', '#474747', 1000);
    const blob2 = await createSampleCanvas('Customer Chat Transcript & Notes', '#313033', '#daf200', 1200);
    if (!blob1 || !blob2) {
      showToast('Could not create the demo images in this browser.', 'error');
      return;
    }

    setActiveTab('upload');
    await addFiles([
      new File([blob1], 'sample-invoice-part1.png', { type: 'image/png' }),
      new File([blob2], 'sample-chat-transcript.png', { type: 'image/png' }),
    ]);
    document.getElementById('converter')?.scrollIntoView({ behavior: 'smooth' });
  };

  const buildPdf = async () => {
    const { generatePdfBlob } = await loadPdfEngine();
    return generatePdfBlob(items, settings);
  };

  // Convert & Export PDF
  const handleExportPDF = async () => {
    if (items.length === 0 || busy) return;
    setBusy('pdf');
    try {
      const { blob } = await buildPdf();
      downloadBlob(blob, pdfFileName);
      showToast('PDF compiled and downloaded');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast(errorMessage(error, 'Failed to generate the PDF. Please check your images and try again.'), 'error');
    } finally {
      setBusy(null);
    }
  };

  // Open Live Preview Modal
  const handleOpenLivePreview = async () => {
    if (items.length === 0 || busy) return;
    setBusy('preview');
    try {
      const { blob, dimensionsText } = await buildPdf();
      const url = URL.createObjectURL(blob);
      setPreviewPdf((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return { blob, url, dimensionsText };
      });
      setActivePreviewItem(null);
      setPreviewOpen(true);
    } catch (err) {
      console.error(err);
      showToast(errorMessage(err, 'Could not build the preview.'), 'error');
    } finally {
      setBusy(null);
    }
  };

  // Download Stitched PNG
  const handleDownloadStitchedPng = async () => {
    if (items.length === 0 || busy) return;
    setBusy('png');
    try {
      const blob = await generateStitchedPng(items);
      downloadBlob(blob, pngFileName);
      showToast('Stitched PNG downloaded');
    } catch (err) {
      console.error(err);
      showToast(errorMessage(err, 'Could not generate the stitched PNG.'), 'error');
    } finally {
      setBusy(null);
    }
  };

  const scrollToConverter = () => document.getElementById('converter')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="flex justify-center min-h-screen bg-[var(--stage)] text-[var(--ink)]">
      <div className="editorial-sheet w-full flex flex-col relative bg-[var(--paper)] overflow-x-clip !rounded-none !border-x-0 !border-t-0">
        {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] w-max max-w-[calc(100vw-2rem)] bg-[#1F1F1F] text-[#F8FAFD] px-5 py-3 rounded-2xl text-xs font-semibold shadow-lg flex items-center gap-2"
          >
            {toast.tone === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-[#ff8a80]" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#C4EED0]" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-page drop target while files are dragged over the window */}
      {isDragging && (
        <div className="fixed inset-0 z-[55] pointer-events-none bg-[#daf200]/20 border-4 border-dashed border-[#313033] flex items-center justify-center">
          <div className="bg-[#1F1F1F] text-white text-sm font-bold px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Drop images to add them to the queue
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <Header queueCount={items.length} onScrollToConverter={scrollToConverter} />

      {/* Main Container */}
      <main className="pt-28 pb-20 px-4 sm:px-8 md:px-12 relative z-10">
        {/* Hero Section */}
        <div className="max-w-5xl mx-auto text-center space-y-6 pt-6 relative">
          {/* Decorative SVG Ribbon Background - Bleeds across entire screen width */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[700px] z-0 pointer-events-none flex justify-center items-center opacity-80">
            <svg viewBox="0 0 1600 700" className="w-full h-full" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="glowing-blur" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="40" result="blur" />
                </filter>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#daf200" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#00d4ff" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#7f00ff" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="grad2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ff007f" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#ff7f00" stopOpacity="0.1" />
                </linearGradient>
                <linearGradient id="ribbon-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ff3366" />
                  <stop offset="50%" stopColor="#ff9933" />
                  <stop offset="100%" stopColor="#daf200" />
                </linearGradient>
              </defs>
              
              {/* Fluid Ribbon Paths */}
              <path 
                d="M -100 500 C 300 650, 400 150, 800 300 C 1100 450, 1300 200, 1700 150" 
                fill="none" 
                stroke="url(#ribbon-gradient)" 
                strokeWidth="90" 
                strokeLinecap="round" 
                opacity="0.4" 
                filter="url(#glowing-blur)"
              />
              <path 
                d="M -50 480 C 350 630, 450 170, 850 320 C 1150 470, 1350 220, 1750 170" 
                fill="none" 
                stroke="url(#ribbon-gradient)" 
                strokeWidth="40" 
                strokeLinecap="round" 
                opacity="0.8"
              />
              <path 
                d="M 0 450 C 300 600, 500 200, 900 350 C 1200 500, 1400 250, 1800 200" 
                fill="none" 
                stroke="url(#grad1)" 
                strokeWidth="20" 
                strokeLinecap="round" 
                opacity="0.9"
              />
            </svg>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif font-normal tracking-tight text-[#151515] relative z-10">
            Continuous Image & Web <br />
            <span className="text-[#313033]">
              to <span className="bg-[#FFFF00] px-3 mx-1 font-sans text-black inline-block">PDF</span> Studio.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-[#474747] max-w-3xl mx-auto leading-relaxed relative z-10">
            Stitch scrolling screenshots, chats, receipts, and live websites into one unbroken, continuous PDF document. No arbitrary page breaks slicing your content in half.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 relative z-10">
            <button
              type="button"
              onClick={scrollToConverter}
              className="editorial-btn editorial-btn-dark px-6 py-3 text-sm shadow-md cursor-pointer"
            >
              Start Converting
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={loadDemoSamples}
              className="editorial-btn editorial-btn-outlined px-5 py-3 text-sm border-[#aaa] text-[#151515] hover:bg-[#dedede] cursor-pointer"
            >
              Load Demo Images
            </button>
          </div>

          {/* Quick Shortcuts Bar */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[#474747] pt-3 relative z-10">
            <span className="inline-flex items-center gap-1.5">
              <kbd className="px-2 py-0.5 bg-[#dedede] border border-[#aaa] rounded-md text-[11px] font-mono text-[#151515]">Ctrl+V</kbd>
              <span>to Paste Screenshots</span>
            </span>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                setActiveTab('url');
                scrollToConverter();
              }}
              className="inline-flex items-center gap-1.5 hover:underline cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-[#313033]" />
              <span>Full Webpage Capture</span>
            </button>
            <span>•</span>
            <span className="inline-flex items-center gap-1.5">
              <FileImage className="w-3.5 h-3.5 text-[#313033]" />
              <span>PNG, WebP, JPG, GIF, SVG</span>
            </span>
          </div>
        </div>

        {/* Marquee Section */}
        <div className="-mx-4 sm:-mx-8 md:-mx-12 overflow-hidden border-y border-[var(--line)] bg-[var(--paper)] py-3 mt-12 mb-4 flex relative shadow-sm">
          <div className="flex w-max animate-marquee text-[10px] sm:text-xs font-bold tracking-[0.15em] uppercase text-[var(--charcoal)] items-center select-none">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center shrink-0">
                <span className="px-5">Trusted by Designers</span>
                <span className="text-[var(--accent)] text-lg leading-none mt-[-2px]">•</span>
                <span className="px-5">Developers</span>
                <span className="text-[var(--accent)] text-lg leading-none mt-[-2px]">•</span>
                <span className="px-5">Product Managers</span>
                <span className="text-[var(--accent)] text-lg leading-none mt-[-2px]">•</span>
                <span className="px-5">Students</span>
                <span className="text-[var(--accent)] text-lg leading-none mt-[-2px]">•</span>
                <span className="px-5">Researchers</span>
                <span className="text-[var(--accent)] text-lg leading-none mt-[-2px]">•</span>
              </div>
            ))}
          </div>
        </div>

        {/* Converter Main Studio Applet */}
        <div id="converter" className="max-w-6xl w-full mx-auto mt-8 scroll-mt-24">
          <div className="bg-[#f4f4f1] border border-[#b8b8b8] rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden">
            {/* Top Bar with Tabs */}
            <div className="px-4 sm:px-6 py-5 bg-[#f4f4f1] border-b border-[#b8b8b8] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 font-semibold text-[#151515] text-sm">
                <div className="w-8 h-8 rounded-xl bg-[#daf200] text-[#313033] flex items-center justify-center shadow-xs">
                  <Layers className="w-4 h-4" />
                </div>
                <span>FreePDFConverter Studio</span>
              </div>

              {/* Segmented Control */}
              <div className="editorial-segmented max-w-full overflow-x-auto whitespace-nowrap hide-scrollbar" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'upload'}
                  onClick={() => setActiveTab('upload')}
                  className={`editorial-segmented-item ${activeTab === 'upload' ? 'active' : ''}`}
                >
                  Image Files & Paste
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'url'}
                  onClick={() => setActiveTab('url')}
                  className={`editorial-segmented-item ${activeTab === 'url' ? 'active' : ''}`}
                >
                  Website URL
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="p-3 sm:p-8">
              <input
                type="file"
                multiple
                accept={SUPPORTED_MIME_TYPES.join(',')}
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
                data-testid="file-input"
              />

              {/* TAB 1: WEBSITE URL CAPTURE */}
              {activeTab === 'url' ? (
                <div className="bg-[#f4f4f1] rounded-2xl border border-[#b8b8b8] p-5 sm:p-8 space-y-6">
                  <div className="max-w-md mx-auto text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-[#daf200] text-[#313033] flex items-center justify-center mx-auto mb-3 shadow-xs">
                      <Globe className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-[#151515]">Capture Live Website</h3>
                    <p className="text-xs text-[#474747] leading-relaxed">
                      Enter any public URL and we'll render the whole page as one crisp, full-length PNG ready for stitching.
                    </p>
                  </div>

                  {/* Viewport & Theme controls */}
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <div className="editorial-segmented max-w-full overflow-x-auto whitespace-nowrap hide-scrollbar">
                      <button
                        type="button"
                        onClick={() => setViewport('desktop')}
                        className={`editorial-segmented-item ${viewport === 'desktop' ? 'active' : ''}`}
                      >
                        <Laptop className="w-3.5 h-3.5" />
                        <span>Desktop (1440px)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewport('tablet')}
                        className={`editorial-segmented-item ${viewport === 'tablet' ? 'active' : ''}`}
                      >
                        <Tablet className="w-3.5 h-3.5" />
                        <span>Tablet (768px)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewport('mobile')}
                        className={`editorial-segmented-item ${viewport === 'mobile' ? 'active' : ''}`}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Mobile (390px)</span>
                      </button>
                    </div>

                    <div className="editorial-segmented max-w-full overflow-x-auto whitespace-nowrap hide-scrollbar">
                      <button
                        type="button"
                        onClick={() => setColorScheme('light')}
                        className={`editorial-segmented-item ${colorScheme === 'light' ? 'active' : ''}`}
                      >
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        <span>Light</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setColorScheme('dark')}
                        className={`editorial-segmented-item ${colorScheme === 'dark' ? 'active' : ''}`}
                      >
                        <Moon className="w-3.5 h-3.5 text-[#313033]" />
                        <span>Dark</span>
                      </button>
                    </div>
                  </div>

                  {/* URL Input Form */}
                  <form
                    className="max-w-xl mx-auto flex flex-col sm:flex-row items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleCaptureUrl();
                    }}
                  >
                    <div className="relative w-full flex-1">
                      <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
                      <input
                        type="text"
                        inputMode="url"
                        autoComplete="url"
                        aria-label="Website address"
                        placeholder="https://news.ycombinator.com"
                        value={urlInput}
                        onChange={(e) => {
                          setUrlInput(e.target.value);
                          setCaptureError(null);
                        }}
                        // .editorial-input's own padding outranks Tailwind's pl-*, so clear the icon inline.
                        style={{ paddingLeft: '2.5rem' }}
                        className="editorial-input text-sm rounded-xl border-[#aaa] focus:border-[#0B57D0]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isCapturing || !urlInput.trim()}
                      className="editorial-btn editorial-btn-dark py-2.5 px-5 text-sm h-11 w-full sm:w-auto cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCapturing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Capturing...</span>
                        </>
                      ) : (
                        <>
                          <span>Capture</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Capturing Progress Indicator */}
                  {isCapturing && (
                    <div className="text-center space-y-2 py-2">
                      <p className="text-xs text-[#313033] font-semibold animate-pulse">{captureStatus}</p>
                      <div className="w-48 h-1 bg-[#daf200] rounded-full overflow-hidden mx-auto">
                        <div className="w-full h-full bg-[#313033] animate-pulse" />
                      </div>
                      <p className="text-[11px] text-[#666666]">Long pages can take up to a minute.</p>
                    </div>
                  )}

                  {captureError && !isCapturing && (
                    <div role="alert" className="max-w-xl mx-auto flex items-start gap-2 text-xs text-[#b71c1c] bg-[#ffcdd2]/40 border border-[#ffcdd2] rounded-xl px-4 py-3">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
                      <span>{captureError}</span>
                    </div>
                  )}

                  {/* Quick Presets */}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-[#474747]">
                    <span className="text-[#666666]">Try popular:</span>
                    {[
                      { name: 'Hacker News', url: 'https://news.ycombinator.com' },
                      { name: 'Wikipedia Main', url: 'https://en.wikipedia.org' },
                      { name: 'GitHub Trends', url: 'https://github.com/trending' },
                    ].map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        disabled={isCapturing}
                        onClick={() => {
                          setUrlInput(preset.url);
                          void handleCaptureUrl(preset.url);
                        }}
                        className="editorial-chip hover:border-[#0B57D0] hover:text-[#313033] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] text-[#666666] text-center max-w-md mx-auto leading-relaxed">
                    Pages are rendered by the free <a href="https://microlink.io" target="_blank" rel="noreferrer" className="underline">Microlink</a> screenshot service, so the address you enter is sent to them. Your uploaded images never leave your device.
                  </p>

                  {items.length > 0 && (
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveTab('upload')}
                        className="text-xs font-semibold text-[#313033] hover:underline cursor-pointer"
                      >
                        ← Return to queue ({items.length} file{items.length !== 1 ? 's' : ''} ready)
                      </button>
                    </div>
                  )}
                </div>
              ) : items.length === 0 ? (
                /* TAB 2: EMPTY DROPZONE */
                <div
                  className={`relative rounded-2xl sm:rounded-3xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center p-6 sm:p-10 text-center min-h-[300px] ${
                    isDragging
                      ? 'border-[#0B57D0] bg-[#daf200]/20 scale-[1.01]'
                      : 'border-[#aaa] bg-[#f4f4f1] hover:border-[#0B57D0] hover:bg-[#dedede]'
                  }`}
                >
                  <div className="w-16 h-16 rounded-2xl bg-[#daf200] text-[#313033] flex items-center justify-center mb-4 shadow-xs">
                    <Upload className="w-8 h-8" />
                  </div>

                  <h3 className="text-xl font-bold text-[#151515]">Drop your PNGs or Screenshots here</h3>
                  <p className="text-xs sm:text-sm text-[#474747] mt-1.5 max-w-md leading-relaxed">
                    Drag & drop multiple images in order, or press <kbd className="px-2 py-0.5 text-xs bg-[#f4f4f1] border border-[#aaa] rounded-md font-mono font-bold text-[#151515]">Ctrl+V</kbd> anywhere to paste from clipboard.
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="editorial-btn editorial-btn-dark py-2.5 px-6 text-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Browse Files
                    </button>

                    <button
                      type="button"
                      onClick={loadDemoSamples}
                      className="editorial-btn editorial-btn-outlined py-2.5 px-4 text-xs border-[#aaa] text-[#151515] hover:bg-[#dedede] cursor-pointer"
                    >
                      Load Demo Sample
                    </button>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-[#666666]">
                    <span>PNG, JPG, WebP, GIF, SVG, BMP</span>
                    <span>•</span>
                    <span>No uploads</span>
                    <span>•</span>
                    <span>100% In-Browser Private</span>
                  </div>
                </div>
              ) : (
                /* TAB 2: ACTIVE QUEUE & CONVERSION DASHBOARD */
                <div className="space-y-6">
                  {/* Active Queue Manager Component */}
                  <div className="bg-[#f4f4f1] rounded-2xl border border-[#b8b8b8] p-3 sm:p-5 shadow-xs">
                    <QueueManager
                      items={items}
                      busy={busy === 'crop'}
                      onRemove={removeItem}
                      onMoveUp={(index) => moveItem(index, -1)}
                      onMoveDown={(index) => moveItem(index, 1)}
                      onRotate={rotateItem}
                      onDuplicate={duplicateItem}
                      onClearAll={clearAllItems}
                      onReverse={reverseItems}
                      onOpenAddModal={() => fileInputRef.current?.click()}
                      onPreviewItem={(item) => {
                        setActivePreviewItem(item);
                        setPreviewOpen(true);
                      }}
                      onCropItem={setActiveCropItem}
                      onReorder={setItems}
                      onApplyGlobalCrop={applyGlobalTopCrop}
                    />
                  </div>

                  {/* Settings Accordion Toggle */}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowSettings(!showSettings)}
                      aria-expanded={showSettings}
                      className="inline-flex flex-wrap items-center gap-2 text-xs font-semibold text-[#151515] hover:text-[#313033] transition-colors cursor-pointer"
                    >
                      <SlidersHorizontal className="w-4 h-4 text-[#313033]" />
                      <span>{showSettings ? 'Hide PDF Settings' : 'Customize PDF Settings & Layout'}</span>
                      <span className="editorial-chip text-[10px] py-0.5 px-2 bg-[#daf200] text-[#151515] border-none font-semibold">
                        {settings.layoutMode === 'continuous' ? 'Continuous Canvas' : 'Paginated'}
                      </span>
                    </button>
                  </div>

                  {/* PDF Configuration Panel */}
                  <AnimatePresence>
                    {showSettings && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <SettingsPanel settings={settings} onChange={setSettings} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Conversion Action Bar */}
                  <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center justify-between gap-4 pt-4 border-t border-[#b8b8b8]">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <button
                        type="button"
                        onClick={handleOpenLivePreview}
                        disabled={!!busy}
                        className="editorial-btn editorial-btn-outlined py-2.5 px-4 text-xs font-semibold border-[#aaa] text-[#151515] hover:bg-[#dedede] cursor-pointer justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {busy === 'preview' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Eye className="w-3.5 h-3.5 text-[#313033]" />
                        )}
                        Live Document Preview
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadStitchedPng}
                        disabled={!!busy}
                        className="editorial-btn editorial-btn-tonal py-2.5 px-4 text-xs font-semibold text-[#151515] bg-[#daf200] hover:bg-[#C2D7FA] inline-flex cursor-pointer justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {busy === 'png' ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileImage className="w-3.5 h-3.5 text-[#313033]" />
                        )}
                        Export as Long PNG
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <button
                        type="button"
                        onClick={handleExportPDF}
                        disabled={!!busy}
                        className="editorial-btn editorial-btn-dark py-2.5 px-6 text-sm font-semibold shadow-md cursor-pointer justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {busy === 'pdf' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Compiling PDF...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            <span>Download PDF</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Feature Showcase & Comparisons */}
        <div className="mt-36">
          <FeatureShowcase />
        </div>

        {/* FAQ Section */}
        <div className="mt-32">
          <FAQSection />
        </div>

        {/* Mission Statement */}
        <div className="mt-24 mb-16">
          <MissionStatement />
        </div>
      </main>

      {/* Global Document & Item Preview Modal */}
      {previewOpen && (
        <Suspense fallback={null}>
          <PreviewModal
            onClose={() => {
              setPreviewOpen(false);
              setActivePreviewItem(null);
            }}
            pdfUrl={previewPdf?.url ?? null}
            dimensionsText={previewPdf?.dimensionsText ?? ''}
            fileName={pdfFileName}
            onDownloadPdf={() => {
              if (!previewPdf) return;
              downloadBlob(previewPdf.blob, pdfFileName);
              showToast('PDF downloaded');
            }}
            onDownloadPng={handleDownloadStitchedPng}
            singleImageItem={activePreviewItem}
          />
        </Suspense>
      )}

      {activeCropItem && (
        <Suspense fallback={null}>
          <CropModal
            key={activeCropItem.id}
            item={activeCropItem}
            onClose={() => setActiveCropItem(null)}
            onSave={(id, edit) => {
              replaceItem(id, edit);
              showToast('Image cropped');
            }}
          />
        </Suspense>
      )}

      {/* Footer */}
      <Footer />
      </div>
    </div>
  );
}
