/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  ArrowRight, 
  Layers, 
  X, 
  Loader2, 
  Globe, 
  Link as LinkIcon, 
  Eye, 
  CheckCircle2, 
  SlidersHorizontal, 
  Laptop, 
  Tablet, 
  Smartphone, 
  Sun, 
  Moon, 
  Download, 
  FileImage, 
  Plus,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { QueueManager } from './components/QueueManager';
import { SettingsPanel } from './components/SettingsPanel';
import { PreviewModal } from './components/PreviewModal';
import { CropModal } from './components/CropModal';
import { FeatureShowcase } from './components/FeatureShowcase';
import { FAQSection } from './components/FAQSection';
import { MissionStatement } from './components/MissionStatement';
import { Footer } from './components/Footer';
import { ImageItem, ConversionSettings, ViewportDevice } from './types';
import { generatePdfBlob, generateStitchedPng } from './utils/pdfEngine';

export default function App() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  
  // URL capture states
  const [urlInput, setUrlInput] = useState('');
  const [viewport, setViewport] = useState<ViewportDevice>('desktop');
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light');
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureStatus, setCaptureStatus] = useState('');

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
    scaleMode: 'fit_width',
  });

  // Modal states
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewPdfBlob, setPreviewPdfBlob] = useState<Blob | null>(null);
  const [previewDimensionsText, setPreviewDimensionsText] = useState('');
  const [previewTotalPages, setPreviewTotalPages] = useState(1);
  const [activePreviewItem, setActivePreviewItem] = useState<ImageItem | null>(null);

  const [cropOpen, setCropOpen] = useState(false);
  const [activeCropItem, setActiveCropItem] = useState<ImageItem | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Helper to load file as ImageItem with dimensions
  const processFilesToItems = async (filesList: File[]) => {
    const validFiles = filesList.filter((file) =>
      ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml', 'image/bmp'].includes(file.type) ||
      file.name.match(/\.(png|jpe?g|webp|gif|svg|bmp)$/i)
    );

    if (validFiles.length === 0) return;

    const newItems: ImageItem[] = await Promise.all(
      validFiles.map((file) => {
        return new Promise<ImageItem>((resolve) => {
          const previewUrl = URL.createObjectURL(file);
          const img = new Image();
          img.onload = () => {
            resolve({
              id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              file,
              previewUrl,
              name: file.name,
              size: file.size,
              width: img.naturalWidth || 1200,
              height: img.naturalHeight || 800,
              rotation: 0,
            });
          };
          img.onerror = () => {
            resolve({
              id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              file,
              previewUrl,
              name: file.name,
              size: file.size,
              width: 1200,
              height: 800,
              rotation: 0,
            });
          };
          img.src = previewUrl;
        });
      })
    );

    setItems((prev) => [...prev, ...newItems]);
    showToast(`Added ${newItems.length} image${newItems.length !== 1 ? 's' : ''} to queue`);
  };

  // Global Clipboard Paste Listener (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const itemsArr = Array.from(e.clipboardData.items);
      const imageFiles: File[] = [];

      for (const item of itemsArr) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            const pastedFile = new File(
              [blob],
              `clipboard-screenshot-${new Date().toISOString().replace(/[:.]/g, '-')}.png`,
              { type: blob.type || 'image/png' }
            );
            imageFiles.push(pastedFile);
          }
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        await processFilesToItems(imageFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFilesToItems(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFilesToItems(Array.from(e.target.files));
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Global crop tool
  const applyGlobalTopCrop = async (cropPercentage: number) => {
    if (cropPercentage <= 0) return;
    setIsConverting(true);
    const factor = cropPercentage / 100;
    
    try {
      const newItems = await Promise.all(items.map((item) => {
        return new Promise<ImageItem>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const cropPixels = Math.floor(img.naturalHeight * factor);
            const newHeight = img.naturalHeight - cropPixels;
            
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = newHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(item);

            ctx.drawImage(
              img,
              0, cropPixels, img.naturalWidth, newHeight,
              0, 0, img.naturalWidth, newHeight
            );

            canvas.toBlob((blob) => {
              if (!blob) return resolve(item);
              const newFile = new File([blob], item.file.name, { type: item.file.type || 'image/png' });
              const newPreviewUrl = URL.createObjectURL(blob);
              
              URL.revokeObjectURL(item.previewUrl);
              
              resolve({
                ...item,
                file: newFile,
                previewUrl: newPreviewUrl,
                height: newHeight,
                size: blob.size
              });
            }, item.file.type || 'image/png', 1);
          };
          img.onerror = () => resolve(item);
          img.src = item.previewUrl;
        });
      }));
      setItems(newItems);
      showToast(`Cropped top ${cropPercentage}% off all images!`);
    } catch (err) {
      console.error(err);
      alert('Failed to crop images.');
    } finally {
      setIsConverting(false);
    }
  };

  // Queue manipulation functions
  const handleReorder = (newItems: ImageItem[]) => {
    setItems(newItems);
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const itemToRemove = prev.find((i) => i.id === id);
      if (itemToRemove) URL.revokeObjectURL(itemToRemove.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const moveItemUp = (index: number) => {
    if (index === 0) return;
    setItems((prev) => {
      const copy = [...prev];
      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
      return copy;
    });
  };

  const moveItemDown = (index: number) => {
    if (index === items.length - 1) return;
    setItems((prev) => {
      const copy = [...prev];
      [copy[index + 1], copy[index]] = [copy[index], copy[index + 1]];
      return copy;
    });
  };

  const rotateItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, rotation: (item.rotation + 90) % 360 } : item
      )
    );
  };

  const duplicateItem = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const duplicated: ImageItem = {
      ...item,
      id: `${item.name}-copy-${Date.now()}`,
      name: `${item.name.replace(/\.[^/.]+$/, '')} (Copy)`,
    };
    setItems((prev) => [...prev, duplicated]);
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
    const targetUrl = presetUrl || urlInput;
    if (!targetUrl) return;

    let cleanUrl = targetUrl.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }

    setIsCapturing(true);
    setCaptureStatus('Initializing browser engine...');

    try {
      setCaptureStatus('Rendering webpage assets & fonts...');
      const res = await fetch('/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cleanUrl,
          viewport,
          colorScheme,
          fullPage: true,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to capture screenshot');
      }

      setCaptureStatus('Processing screenshot image...');
      const blob = await res.blob();
      const hostname = new URL(cleanUrl).hostname.replace('www.', '');
      const capturedFile = new File([blob], `${hostname}-fullpage-${viewport}.png`, {
        type: 'image/png',
      });

      await processFilesToItems([capturedFile]);
      setUrlInput('');
      setActiveTab('upload');
      showToast(`Captured full-page screenshot of ${hostname}!`);
    } catch (error: any) {
      console.error(error);
      alert(`Could not capture ${cleanUrl}. Error: ${error.message || 'Please check the URL.'}`);
    } finally {
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
        const grad = ctx.createLinearGradient(0, 0, 1200, height);
        grad.addColorStop(0, color1);
        grad.addColorStop(1, color2);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1200, height);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
        ctx.roundRect ? ctx.roundRect(80, 60, 1040, 120, 24) : ctx.fillRect(80, 60, 1040, 120);
        ctx.fill();

        ctx.fillStyle = '#041E49';
        ctx.font = 'bold 36px Roboto, sans-serif';
        ctx.fillText(title, 120, 135);

        for (let y = 220; y < height - 100; y += 180) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
          ctx.roundRect ? ctx.roundRect(80, y, 1040, 140, 20) : ctx.fillRect(80, y, 1040, 140);
          ctx.fill();

          ctx.fillStyle = '#1F1F1F';
          ctx.font = '22px Roboto, sans-serif';
          ctx.fillText('• Verified continuous ledger entry and scrolling transaction item', 120, y + 60);
          ctx.fillStyle = '#444746';
          ctx.font = '16px Roboto, sans-serif';
          ctx.fillText('Timestamp: 10:42 AM • Status: Complete • Hash #8492048', 120, y + 100);
        }
      }
      return new Promise<Blob>((resolve) => {
        c.toBlob((blob) => resolve(blob!), 'image/png');
      });
    };

    const blob1 = await createSampleCanvas('Order Summary & Invoice #4092', '#313033', '#474747', 1000);
    const blob2 = await createSampleCanvas('Customer Chat Transcript & Notes', '#313033', '#daf200', 1200);

    const file1 = new File([blob1], 'sample-invoice-part1.png', { type: 'image/png' });
    const file2 = new File([blob2], 'sample-chat-transcript.png', { type: 'image/png' });

    await processFilesToItems([file1, file2]);
  };

  // Convert & Export PDF
  const processSecurePdf = async (blob: Blob, settings: ConversionSettings) => {
    if (!settings.watermark) return blob;
    
    // Convert blob to base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const res = await fetch('/api/secure-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pdfBase64: base64,
        watermark: settings.watermark
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to secure PDF: ${err}`);
    }
    
    const { pdfBase64: securedBase64 } = await res.json();
    if (!securedBase64) {
      throw new Error('No secured base64 returned from server');
    }
    
    const fetchRes = await fetch(`data:application/pdf;base64,${securedBase64}`);
    return await fetchRes.blob();
  };

  const handleExportPDF = async () => {
    if (items.length === 0) return;
    setIsConverting(true);

    try {
      let { blob, url, totalPages, dimensionsText } = await generatePdfBlob(items, settings);
      
      URL.revokeObjectURL(url); // Don't leak original URL
      
      blob = await processSecurePdf(blob, settings);
      const secureUrl = URL.createObjectURL(blob);
      
      setPreviewPdfBlob(blob);
      setPreviewPdfUrl(prevUrl => {
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        return secureUrl;
      });
      setPreviewTotalPages(totalPages);
      setPreviewDimensionsText(dimensionsText);
      setActivePreviewItem(null);

      // Trigger download
      const a = document.createElement('a');
      a.href = secureUrl;
      a.download = `${settings.fileName || 'freepdfconverter'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showToast('PDF successfully compiled and downloaded!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please check your images and try again.');
    } finally {
      setIsConverting(false);
    }
  };

  // Open Live Preview Modal
  const handleOpenLivePreview = async () => {
    if (items.length === 0) return;
    setIsConverting(true);
    try {
      let { blob, url, totalPages, dimensionsText } = await generatePdfBlob(items, settings);
      
      URL.revokeObjectURL(url); // Don't leak original URL
      
      blob = await processSecurePdf(blob, settings);
      const secureUrl = URL.createObjectURL(blob);

      setPreviewPdfBlob(blob);
      setPreviewPdfUrl(prevUrl => {
        if (prevUrl) URL.revokeObjectURL(prevUrl);
        return secureUrl;
      });
      setPreviewTotalPages(totalPages);
      setPreviewDimensionsText(dimensionsText);
      setActivePreviewItem(null);
      setPreviewOpen(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsConverting(false);
    }
  };

  // Download Stitched PNG
  const handleDownloadStitchedPng = async () => {
    if (items.length === 0) return;
    try {
      const { url } = await generateStitchedPng(items);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${settings.fileName || 'freepdfconverter'}-stitched.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('Stitched full PNG image downloaded!');
    } catch (err) {
      console.error(err);
      alert('Could not generate stitched PNG.');
    }
  };

  return (
    <div className="flex justify-center min-h-screen bg-[var(--stage)] text-[var(--ink)]">
      <div className="editorial-sheet w-full flex flex-col relative bg-[var(--paper)] overflow-x-clip !rounded-none !border-x-0 !border-t-0">
        {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#1F1F1F] text-[#F8FAFD] px-5 py-3 rounded-full text-xs font-semibold shadow-lg flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-[#C4EED0]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Header */}
      <Header 
        queueCount={items.length} 
        onScrollToConverter={() => document.getElementById('converter')?.scrollIntoView({ behavior: 'smooth' })} 
      />

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

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => document.getElementById('converter')?.scrollIntoView({ behavior: 'smooth' })}
              className="editorial-btn editorial-btn-dark px-6 py-3 text-sm shadow-md cursor-pointer"
            >
              Start Converting
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={loadDemoSamples}
              className="editorial-btn editorial-btn-outlined px-5 py-3 text-sm border-[#aaa] text-[#151515] hover:bg-[#dedede] cursor-pointer"
            >
              Load Demo Images
            </button>
          </div>

          {/* Quick Shortcuts Bar */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-[#474747] pt-3">
            <span className="inline-flex items-center gap-1.5">
              <kbd className="px-2 py-0.5 bg-[#dedede] border border-[#aaa] rounded-md text-[11px] font-mono text-[#151515]">Ctrl+V</kbd>
              <span>to Paste Screenshots</span>
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#313033]" />
              <span>Full Webpage Capture</span>
            </span>
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
        <div id="converter" className="max-w-6xl w-full mx-auto mt-8">
          <div className="bg-[#f4f4f1] border border-[#b8b8b8] rounded-2xl sm:rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden">
            {/* Top Bar with Tabs */}
            <div className="px-6 py-5 bg-[#f4f4f1] border-b border-[#b8b8b8] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 font-semibold text-[#151515] text-sm">
                <div className="w-8 h-8 rounded-xl bg-[#daf200] text-[#313033] flex items-center justify-center shadow-xs">
                  <Layers className="w-4 h-4" />
                </div>
                <span>FreePDFConverter Studio</span>
              </div>

              {/* Segmented Control */}
              <div className="editorial-segmented max-w-full overflow-x-auto whitespace-nowrap hide-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`editorial-segmented-item ${activeTab === 'upload' ? 'active' : ''}`}
                >
                  Image Files & Paste
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('url')}
                  className={`editorial-segmented-item ${activeTab === 'url' ? 'active' : ''}`}
                >
                  Website URL
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="p-6 sm:p-8">
              <input
                type="file"
                multiple
                accept="image/png, image/jpeg, image/jpg, image/webp, image/gif, image/svg+xml, image/bmp"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />

              {/* TAB 1: WEBSITE URL CAPTURE */}
              {activeTab === 'url' ? (
                <div className="bg-[#f4f4f1] rounded-2xl border border-[#b8b8b8] p-6 sm:p-8 space-y-6">
                  <div className="max-w-md mx-auto text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-[#daf200] text-[#313033] flex items-center justify-center mx-auto mb-3 shadow-xs">
                      <Globe className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-[#151515]">Capture Live Website</h3>
                    <p className="text-xs text-[#474747] leading-relaxed">
                      Enter any public URL. Our headless engine will auto-scroll through lazy-loaded images and generate a crisp full-page PNG ready for stitching.
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
                  <div className="max-w-xl mx-auto flex flex-col sm:flex-row items-center gap-2">
                    <div className="relative w-full flex-1">
                      <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
                      <input
                        type="url"
                        placeholder="https://news.ycombinator.com"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCaptureUrl()}
                        className="editorial-input pl-10 text-sm rounded-xl border-[#aaa] focus:border-[#0B57D0]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCaptureUrl()}
                      disabled={isCapturing || !urlInput}
                      className="editorial-btn editorial-btn-dark py-2.5 px-5 text-sm h-11 w-full sm:w-auto cursor-pointer"
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
                  </div>

                  {/* Capturing Progress Indicator */}
                  {isCapturing && (
                    <div className="text-center space-y-2 py-2">
                      <p className="text-xs text-[#313033] font-semibold animate-pulse">{captureStatus}</p>
                      <div className="w-48 h-1 bg-[#daf200] rounded-full overflow-hidden mx-auto">
                        <div className="w-full h-full bg-[#313033] animate-pulse" />
                      </div>
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
                        onClick={() => {
                          setUrlInput(preset.url);
                          handleCaptureUrl(preset.url);
                        }}
                        className="editorial-chip hover:border-[#0B57D0] hover:text-[#313033] transition-colors cursor-pointer"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>

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
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative rounded-2xl sm:rounded-3xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center p-10 text-center min-h-[300px] ${
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

                  <div className="mt-6 flex items-center gap-3 text-xs text-[#666666]">
                    <span>PNG, JPG, WebP, GIF, SVG</span>
                    <span>•</span>
                    <span>No file size limits</span>
                    <span>•</span>
                    <span>100% In-Browser Private</span>
                  </div>
                </div>
              ) : (
                /* TAB 2: ACTIVE QUEUE & CONVERSION DASHBOARD */
                <div className="space-y-6">
                  {/* Active Queue Manager Component */}
                  <div className="bg-[#f4f4f1] rounded-2xl border border-[#b8b8b8] p-5 shadow-xs">
                    <QueueManager
                      items={items}
                      onRemove={removeItem}
                      onMoveUp={moveItemUp}
                      onMoveDown={moveItemDown}
                      onRotate={rotateItem}
                      onDuplicate={duplicateItem}
                      onClearAll={clearAllItems}
                      onReverse={reverseItems}
                      onOpenAddModal={() => fileInputRef.current?.click()}
                      onPreviewItem={(item) => {
                        setActivePreviewItem(item);
                        setPreviewOpen(true);
                      }}
                      onCropItem={(item) => {
                        setActiveCropItem(item);
                        setCropOpen(true);
                      }}
                      onReorder={handleReorder}
                      onApplyGlobalCrop={applyGlobalTopCrop}
                    />
                  </div>

                  {/* Settings Accordion Toggle */}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowSettings(!showSettings)}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-[#151515] hover:text-[#313033] transition-colors cursor-pointer"
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
                        disabled={isConverting}
                        className="editorial-btn editorial-btn-outlined py-2.5 px-4 text-xs font-semibold border-[#aaa] text-[#151515] hover:bg-[#dedede] cursor-pointer justify-center"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#313033]" />
                        Live Document Preview
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadStitchedPng}
                        className="editorial-btn editorial-btn-tonal py-2.5 px-4 text-xs font-semibold text-[#151515] bg-[#daf200] hover:bg-[#C2D7FA] inline-flex cursor-pointer justify-center"
                      >
                        <FileImage className="w-3.5 h-3.5 text-[#313033]" />
                        Export as Long PNG
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <button
                        type="button"
                        onClick={handleExportPDF}
                        disabled={isConverting}
                        className="editorial-btn editorial-btn-dark py-2.5 px-6 text-sm font-semibold shadow-md cursor-pointer justify-center"
                      >
                        {isConverting ? (
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
      <PreviewModal
        isOpen={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setActivePreviewItem(null);
        }}
        pdfUrl={previewPdfUrl}
        dimensionsText={previewDimensionsText}
        totalPages={previewTotalPages}
        fileName={settings.fileName}
        onDownloadPdf={handleExportPDF}
        onDownloadPng={handleDownloadStitchedPng}
        singleImageItem={activePreviewItem}
      />

      <CropModal
        isOpen={cropOpen}
        onClose={() => {
          setCropOpen(false);
          setActiveCropItem(null);
        }}
        item={activeCropItem}
        onSave={(id, newBlob, newPreviewUrl) => {
          setItems(items.map(it => {
            if (it.id === id) {
              URL.revokeObjectURL(it.previewUrl);
              return {
                ...it,
                file: new File([newBlob], it.file.name, { type: it.file.type || 'image/png' }),
                previewUrl: newPreviewUrl,
                size: newBlob.size
              };
            }
            return it;
          }));
          showToast('Image cropped successfully!');
        }}
      />

      {/* Footer */}
      <Footer />
      </div>
    </div>
  );
}
