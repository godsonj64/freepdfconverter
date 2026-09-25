import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import {
  AlertTriangle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Columns2,
  Download,
  FileJson,
  FileSearch,
  FileText,
  FolderOpen,
  Highlighter,
  Info,
  Layers,
  LayoutGrid,
  ListTree,
  Loader2,
  Moon,
  MoreHorizontal,
  PanelLeft,
  Paperclip,
  PenLine,
  Printer,
  RotateCcw,
  RotateCw,
  Rows3,
  Save,
  Search,
  ShieldCheck,
  StretchHorizontal,
  TextCursorInput,
  Type,
  Upload,
  WrapText,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { PDFJS_RESOURCES, pdfjsLib } from './pdfjs';
import { EventBus, LinkTarget, PDFFindController, PDFLinkService, PDFViewer, ScrollMode, SpreadMode } from './viewer';
import { inspectDocument, type DocumentReport } from './inspect';
import { collectFormFields, currentValue, isFilled, type FormField } from './forms';
import { baseName, downloadBytes, exportFormData, extractText, printDocument } from './output';
import { repairXfaSymbolGlyphs } from './xfaFixups';
import { FindBar } from './components/FindBar';
import { Thumbnails } from './components/Thumbnails';
import { OutlineTree, type OutlineItem } from './components/OutlineTree';
import { FieldsPanel } from './components/FieldsPanel';
import { InspectorPanel } from './components/InspectorPanel';
import { PasswordDialog } from './components/PasswordDialog';
import { Menu, MenuItem, MenuSeparator } from './components/Menu';
import './reader.css';

type SidebarTab = 'pages' | 'outline' | 'fields' | 'attachments';

interface Engine {
  eventBus: EventBus;
  linkService: PDFLinkService;
  viewer: PDFViewer;
}

interface Attachment {
  filename: string;
  content: Uint8Array;
  description?: string;
}

interface PasswordPrompt {
  retry: boolean;
  submit: (password: string) => void;
  cancel: () => void;
}

interface BusyState {
  label: string;
  progress?: number;
  cancel?: () => void;
}

const EDITOR = pdfjsLib.AnnotationEditorType;
const ZOOM_PRESETS: Array<[string, string]> = [
  ['auto', 'Automatic'],
  ['page-width', 'Fit width'],
  ['page-fit', 'Fit page'],
  ['page-actual', 'Actual size'],
];
const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
// pdf.js' default highlighter palette (AppOptions.highlightEditorColors); the
// viewer component has no default and the highlight tool crashes without one.
const HIGHLIGHT_COLORS =
  'yellow=#FFFF98,green=#53FFBC,blue=#80EBFF,pink=#FFCBE6,red=#FF4F5F,' +
  'yellow_HCM=#FFFFCC,green_HCM=#53FFBC,blue_HCM=#80EBFF,pink_HCM=#F6B8FF,red_HCM=#C50043';

function describeLoadError(error: unknown): string {
  const name = (error as { name?: string })?.name;
  if (name === 'InvalidPDFException') return 'This file is not a valid PDF, or it is too damaged to repair.';
  if (name === 'PasswordException') return 'This PDF needs a password to open.';
  return (error as Error)?.message || 'The PDF could not be opened.';
}

function isSmallScreen() {
  return window.matchMedia('(max-width: 1023px)').matches;
}

const IconButton: React.FC<{
  label: string;
  onClick: () => void;
  pressed?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ label, onClick, pressed, disabled, className = '', children }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    aria-pressed={pressed}
    disabled={disabled}
    onClick={onClick}
    className={`reader-icon-btn ${pressed ? 'is-active' : ''} ${className}`}
  >
    {children}
  </button>
);

const Divider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`mx-1 h-6 w-px shrink-0 bg-[var(--line)] ${className}`} />
);

export default function PdfReader() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const taskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const loadIdRef = useRef(0);
  // True once the user has edited a field or added an annotation in this
  // document; `dirty` additionally resets after each save.
  const changedRef = useRef(false);

  const [engine, setEngine] = useState<Engine | null>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [passwordPrompt, setPasswordPrompt] = useState<PasswordPrompt | null>(null);

  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [zoom, setZoom] = useState<{ scale: number; preset: string | null }>({ scale: 1, preset: 'auto' });
  const [rotation, setRotation] = useState(0);
  const [scrollMode, setScrollMode] = useState<number>(ScrollMode.VERTICAL);
  const [spreadMode, setSpreadMode] = useState<number>(SpreadMode.NONE);
  const [editorMode, setEditorMode] = useState<number>(EDITOR.NONE);
  const [nightMode, setNightMode] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(() => !isSmallScreen());
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('pages');
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findFocus, setFindFocus] = useState(0);
  const [xfaNoticeOpen, setXfaNoticeOpen] = useState(true);

  const [report, setReport] = useState<DocumentReport | null>(null);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [fields, setFields] = useState<FormField[]>([]);
  const [formVersion, setFormVersion] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<BusyState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const isXfa = !!doc?.isPureXfa;

  const notify = useCallback((message: string, duration = 3500) => {
    setToast(message);
    window.setTimeout(() => setToast((current) => (current === message ? null : current)), duration);
  }, []);

  // ── Viewer engine ────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    const viewerEl = viewerRef.current;
    if (!container || !viewerEl) return;

    const abort = new AbortController();
    const eventBus = new EventBus();
    const linkService = new PDFLinkService({
      eventBus,
      externalLinkTarget: LinkTarget.BLANK,
      externalLinkRel: 'noopener noreferrer nofollow',
    });
    const findController = new PDFFindController({ eventBus, linkService });
    // `abortSignal` (detaches the viewer's scroll/resize observers) is
    // supported at runtime but missing from the published typings.
    const viewerOptions: ConstructorParameters<typeof PDFViewer>[0] & { abortSignal: AbortSignal } = {
      container,
      viewer: viewerEl,
      eventBus,
      linkService,
      findController,
      annotationEditorMode: EDITOR.NONE,
      annotationEditorHighlightColors: HIGHLIGHT_COLORS,
      imageResourcesPath: '/pdfjs/images/',
      enableHWA: true,
      abortSignal: abort.signal,
    };
    const viewer = new PDFViewer(viewerOptions);
    linkService.setViewer(viewer);

    eventBus.on('pagesinit', () => {
      viewer.currentScaleValue = 'auto';
    });
    eventBus.on('pagechanging', ({ pageNumber }: { pageNumber: number }) => {
      setPage(pageNumber);
      setPageInput(String(pageNumber));
    });
    eventBus.on('scalechanging', ({ scale, presetValue }: { scale: number; presetValue?: string }) =>
      setZoom({ scale, preset: presetValue ?? null }),
    );
    eventBus.on('rotationchanging', ({ pagesRotation }: { pagesRotation: number }) => setRotation(pagesRotation));
    eventBus.on('scrollmodechanged', ({ mode }: { mode: number }) => setScrollMode(mode));
    eventBus.on('spreadmodechanged', ({ mode }: { mode: number }) => setSpreadMode(mode));
    eventBus.on('annotationeditormodechanged', ({ mode }: { mode: number }) => setEditorMode(mode));

    // Ctrl/⌘ + wheel (and trackpad pinch, which browsers report the same way) zooms.
    container.addEventListener(
      'wheel',
      (e) => {
        if (!(e.ctrlKey || e.metaKey) || !viewer.pdfDocument) return;
        e.preventDefault();
        const delta = Math.max(-25, Math.min(25, e.deltaY));
        viewer.updateScale({ scaleFactor: Math.exp(-delta / 100), drawingDelay: 300, origin: [e.clientX, e.clientY] });
      },
      { passive: false, signal: abort.signal },
    );

    // Refit fit-to-width/page zoom when panels open or the window resizes;
    // the pdf.js viewer component leaves that to the host application.
    let resizeFrame = 0;
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        const preset = viewer.currentScaleValue;
        if (viewer.pdfDocument && ['auto', 'page-width', 'page-fit'].includes(preset)) {
          viewer.currentScaleValue = preset;
        }
      });
    });
    resizeObserver.observe(container);
    abort.signal.addEventListener('abort', () => {
      cancelAnimationFrame(resizeFrame);
      resizeObserver.disconnect();
    });

    // Form widgets write to annotationStorage from their own input/change
    // handlers; watch the bubbling events so the fields panel stays current.
    let formTimer = 0;
    const onFormEdit = () => {
      changedRef.current = true;
      setDirty(true);
      window.clearTimeout(formTimer);
      formTimer = window.setTimeout(() => setFormVersion((v) => v + 1), 250);
    };
    container.addEventListener('input', onFormEdit, { signal: abort.signal });
    container.addEventListener('change', onFormEdit, { signal: abort.signal });

    const nextEngine = { eventBus, linkService, viewer };
    engineRef.current = nextEngine;
    setEngine(nextEngine);

    return () => {
      window.clearTimeout(formTimer);
      abort.abort();
      engineRef.current = null;
      taskRef.current?.destroy();
      taskRef.current = null;
    };
  }, []);

  // ── Document lifecycle ───────────────────────────────────────────────────
  const closeDocument = useCallback(async () => {
    const current = engineRef.current;
    current?.viewer.setDocument(null as unknown as PDFDocumentProxy);
    current?.linkService.setDocument(null);
    setDoc(null);
    setReport(null);
    setOutline([]);
    setAttachments([]);
    setFields([]);
    setFindOpen(false);
    setDirty(false);
    changedRef.current = false;
    setEditorMode(EDITOR.NONE);
    const task = taskRef.current;
    taskRef.current = null;
    await task?.destroy();
  }, []);

  const loadBytes = useCallback(
    async (bytes: Uint8Array, name: string) => {
      const current = engineRef.current;
      if (!current) return;
      const loadId = ++loadIdRef.current;
      await closeDocument();
      setFile({ name, bytes });
      setStatus('loading');
      setError(null);
      setLoadProgress(0);
      setXfaNoticeOpen(true);

      // pdf.js transfers the buffer to its worker, so hand it a copy and keep
      // the original for hashing, structure scanning and "download original".
      const task = pdfjsLib.getDocument({
        data: bytes.slice(),
        ...PDFJS_RESOURCES,
        enableXfa: true,
        isEvalSupported: false,
      });
      taskRef.current = task;
      let cancelledByUser = false;
      task.onPassword = (update: (password: string) => void, reason: number) => {
        setPasswordPrompt({
          retry: reason === pdfjsLib.PasswordResponses.INCORRECT_PASSWORD,
          submit: (password) => {
            setPasswordPrompt(null);
            update(password);
          },
          cancel: () => {
            cancelledByUser = true;
            setPasswordPrompt(null);
            task.destroy();
          },
        });
      };
      task.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
        if (total) setLoadProgress(loaded / total);
      };

      try {
        const pdf = await task.promise;
        if (loadId !== loadIdRef.current) return;
        // pdf.js' own modified flag also trips when widgets store their initial
        // values, so only user input (see onFormEdit) and annotations count.
        pdf.annotationStorage.onAnnotationEditor = (type: string | null) => {
          if (!type) return;
          changedRef.current = true;
          setDirty(true);
        };
        if (pdf.isPureXfa) repairXfaSymbolGlyphs(pdf.allXfaHtml);
        current.viewer.setDocument(pdf);
        current.linkService.setDocument(pdf);
        setDoc(pdf);
        setStatus('ready');
        setPage(1);
        setPageInput('1');
        setFormVersion(0);

        const [outlineItems, attachmentMap, formFields] = await Promise.all([
          pdf.getOutline(),
          pdf.getAttachments(),
          collectFormFields(pdf),
        ]);
        if (loadId !== loadIdRef.current) return;
        setOutline((outlineItems as OutlineItem[] | null) ?? []);
        setAttachments(Object.values((attachmentMap as Record<string, Attachment> | null) ?? {}));
        setFields(formFields);
        setSidebarTab((tab) => {
          if (tab === 'fields' && formFields.length === 0) return 'pages';
          if (tab === 'outline' && !outlineItems?.length) return 'pages';
          if (tab === 'attachments' && !attachmentMap) return 'pages';
          return pdf.isPureXfa && formFields.length > 0 ? 'fields' : tab;
        });

        inspectDocument(pdf, bytes, name)
          .then((result) => loadId === loadIdRef.current && setReport(result))
          .catch((err) => console.warn('Inspector failed:', err));
      } catch (err) {
        if (loadId !== loadIdRef.current) return;
        if (cancelledByUser) {
          setStatus('idle');
          setFile(null);
          return;
        }
        setStatus('error');
        setError(describeLoadError(err));
      }
    },
    [closeDocument],
  );

  const openFile = useCallback(
    async (picked: File | undefined) => {
      if (!picked) return;
      try {
        await loadBytes(new Uint8Array(await picked.arrayBuffer()), picked.name);
      } catch (err) {
        setStatus('error');
        setError(describeLoadError(err));
      }
    },
    [loadBytes],
  );

  useEffect(() => {
    const title = report?.info.title || file?.name;
    document.title = title ? `${title} · PDF Reader | FreePDFConverter` : 'Research-Grade PDF Reader | FreePDFConverter';
  }, [file, report]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const goToPage = (value: number) => {
    if (!engine || !doc) return;
    const target = Math.min(Math.max(1, Math.round(value)), doc.numPages);
    engine.viewer.currentPageNumber = target;
    setPageInput(String(target));
  };

  const setScaleValue = (value: string) => {
    if (engine && doc) engine.viewer.currentScaleValue = value;
  };

  const rotate = (delta: number) => {
    if (engine && doc) engine.viewer.pagesRotation = (rotation + delta + 360) % 360;
  };

  const toggleEditor = (mode: number) => {
    if (!engine || !doc || isXfa) return;
    try {
      engine.viewer.annotationEditorMode = { mode: editorMode === mode ? EDITOR.NONE : mode };
    } catch (err) {
      notify('Annotation tools are not available for this document.');
      console.warn(err);
    }
  };

  const openFind = () => {
    setFindOpen(true);
    setFindFocus((n) => n + 1);
  };

  const save = async () => {
    if (!doc || !file) return;
    setBusy({ label: 'Saving a copy…' });
    try {
      const modified = changedRef.current;
      const data = modified ? await doc.saveDocument() : file.bytes;
      downloadBytes(data as BlobPart, modified ? `${baseName(file.name)}-edited.pdf` : file.name, 'application/pdf');
      setDirty(false);
      const lost = fields.filter((f) => !f.savable && isFilled(f, currentValue(doc, f))).length;
      if (modified && lost > 0) {
        notify(
          `Saved, but ${lost} filled field${lost > 1 ? 's' : ''} can’t be stored in this form’s data. Use Print → Save as PDF to keep ${lost > 1 ? 'them' : 'it'}.`,
          8000,
        );
      } else {
        notify(modified ? 'Saved a copy with your changes.' : 'No changes yet. Downloaded the original file.');
      }
    } catch (err) {
      notify(`Could not save: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const downloadOriginal = () => {
    if (file) downloadBytes(file.bytes as BlobPart, file.name, 'application/pdf');
  };

  const print = async () => {
    if (!doc) return;
    const controller = new AbortController();
    setBusy({ label: 'Preparing pages for printing', progress: 0, cancel: () => controller.abort() });
    try {
      await printDocument(
        doc,
        (done, total) => setBusy((b) => (b ? { ...b, progress: done / total } : b)),
        controller.signal,
      );
    } catch (err) {
      if ((err as Error).name !== 'AbortError') notify(`Could not print: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const exportText = async () => {
    if (!doc || !file) return;
    setBusy({ label: 'Extracting text…' });
    try {
      downloadBytes(await extractText(doc), `${baseName(file.name)}.txt`, 'text/plain;charset=utf-8');
    } catch (err) {
      notify(`Could not extract text: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const exportFields = () => {
    if (!doc || !file) return;
    const technology = report?.forms.technology ?? (isXfa ? 'dynamic-xfa' : 'acroform');
    const json = exportFormData(doc, fields, { fileName: file.name, sha256: report?.file.sha256 ?? null, technology });
    downloadBytes(json, `${baseName(file.name)}-fields.json`, 'application/json');
  };

  const navigateOutline = (item: OutlineItem) => {
    if (!engine) return;
    if (item.dest) {
      engine.linkService.goToDestination(item.dest);
    } else if (item.url && /^https?:/i.test(item.url)) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
    if (isSmallScreen()) setSidebarOpen(false);
  };

  const jumpToField = (field: FormField) => {
    const container = containerRef.current;
    if (!engine || !doc || !container) return;
    if (field.rect && !isXfa) {
      const [x, , , y] = field.rect;
      engine.viewer.scrollPageIntoView({
        pageNumber: field.page,
        destArray: [null, { name: 'XYZ' }, x - 40, y + 40, null],
      });
    } else {
      engine.viewer.scrollPageIntoView({ pageNumber: field.page });
    }
    if (isSmallScreen()) setSidebarOpen(false);

    // The target page may not be rendered yet; wait a few frames for it.
    const selector = field.elementId
      ? `[data-element-id="${CSS.escape(field.elementId)}"]`
      : `[data-annotation-id="${CSS.escape(field.id)}"]`;
    let frames = 0;
    const attempt = () => {
      const target = container.querySelector<HTMLElement>(selector);
      if (!target) {
        if (++frames < 90) requestAnimationFrame(attempt);
        return;
      }
      target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      const input = target.matches('input, textarea, select')
        ? target
        : target.querySelector<HTMLElement>('input, textarea, select');
      input?.focus({ preventScroll: true });
      target.classList.add('reader-flash');
      window.setTimeout(() => target.classList.remove('reader-flash'), 1400);
    };
    requestAnimationFrame(attempt);
  };

  // Keyboard shortcuts read the latest actions through a ref so the listener
  // is registered once.
  const actionsRef = useRef({ openFind, print, save, goToPage, page, scrollMode, doc });
  actionsRef.current = { openFind, print, save, goToPage, page, scrollMode, doc };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const actions = actionsRef.current;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === 'o') {
        e.preventDefault();
        fileInputRef.current?.click();
        return;
      }
      const viewer = engineRef.current?.viewer;
      if (!actions.doc || !viewer) return;
      if (mod && !e.altKey) {
        const handlers: Record<string, () => void> = {
          f: actions.openFind,
          p: () => void actions.print(),
          s: () => void actions.save(),
          '=': () => viewer.increaseScale(),
          '+': () => viewer.increaseScale(),
          '-': () => viewer.decreaseScale(),
          '0': () => (viewer.currentScaleValue = 'auto'),
        };
        if (handlers[key]) {
          e.preventDefault();
          handlers[key]();
        }
        return;
      }
      const target = e.target as HTMLElement | null;
      if (e.altKey || target?.closest('input, textarea, select, [contenteditable="true"], [role="menu"]')) return;
      if (actions.scrollMode === ScrollMode.HORIZONTAL) return;
      if (e.key === 'ArrowRight') actions.goToPage(actions.page + 1);
      else if (e.key === 'ArrowLeft') actions.goToPage(actions.page - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  const numPages = doc?.numPages ?? 0;
  const zoomSelectValue = zoom.preset ?? String(zoom.scale);
  const zoomIsListed = zoom.preset !== null || ZOOM_LEVELS.includes(zoom.scale);
  const sidebarTabs: Array<{ id: SidebarTab; label: string; icon: React.ReactNode; count?: number }> = [
    { id: 'pages', label: 'Pages', icon: <LayoutGrid className="h-4 w-4" /> },
    ...(outline.length ? [{ id: 'outline' as const, label: 'Outline', icon: <ListTree className="h-4 w-4" /> }] : []),
    ...(fields.length
      ? [{ id: 'fields' as const, label: 'Fields', icon: <TextCursorInput className="h-4 w-4" />, count: fields.length }]
      : []),
    ...(attachments.length
      ? [{ id: 'attachments' as const, label: 'Files', icon: <Paperclip className="h-4 w-4" />, count: attachments.length }]
      : []),
  ];

  return (
    <div
      className="reader-root fixed inset-0 flex flex-col bg-[var(--stage)] text-[var(--ink)]"
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.relatedTarget || !(e.currentTarget as Node).contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void openFile(e.dataTransfer.files[0]);
      }}
    >
      {/* Toolbar */}
      <header className="flex h-14 shrink-0 items-center gap-0.5 border-b border-[var(--line)] bg-[var(--paper)] px-2 sm:gap-1 sm:px-3">
        <a href="/" title="FreePDFConverter home" className="mr-1 flex shrink-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--charcoal)] text-white">
            <Layers className="h-4 w-4" />
          </span>
          <span className="hidden text-[15px] font-bold tracking-tight 2xl:inline">
            Free<span className="text-[var(--charcoal)]">PDF</span> Reader
          </span>
        </a>
        <IconButton label="Toggle sidebar" onClick={() => setSidebarOpen(!sidebarOpen)} pressed={sidebarOpen && !!doc} disabled={!doc}>
          <PanelLeft className="h-4 w-4" />
        </IconButton>
        <IconButton label="Open PDF (Ctrl+O)" onClick={() => fileInputRef.current?.click()}>
          <FolderOpen className="h-4 w-4" />
        </IconButton>

        <Divider className="hidden sm:block" />
        <IconButton label="Previous page" onClick={() => goToPage(page - 1)} disabled={!doc || page <= 1} className="hidden sm:inline-flex">
          <ChevronLeft className="h-4 w-4" />
        </IconButton>
        <form
          className="flex items-center gap-1 text-sm"
          onSubmit={(e) => {
            e.preventDefault();
            goToPage(Number(pageInput) || page);
          }}
        >
          <input
            value={doc ? pageInput : ''}
            disabled={!doc}
            onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ''))}
            onBlur={() => setPageInput(String(page))}
            inputMode="numeric"
            aria-label="Page number"
            className="h-8 w-11 rounded-lg border border-[var(--line)] bg-white text-center text-sm font-semibold tabular-nums outline-none focus:ring-2 focus:ring-[var(--charcoal)]/25 disabled:opacity-50"
          />
          <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-[#555]">/ {numPages || '–'}</span>
        </form>
        <IconButton label="Next page" onClick={() => goToPage(page + 1)} disabled={!doc || page >= numPages} className="hidden sm:inline-flex">
          <ChevronRight className="h-4 w-4" />
        </IconButton>

        <Divider className="hidden md:block" />
        <IconButton label="Zoom out (Ctrl+-)" onClick={() => engine?.viewer.decreaseScale()} disabled={!doc} className="hidden md:inline-flex">
          <ZoomOut className="h-4 w-4" />
        </IconButton>
        <select
          value={zoomSelectValue}
          disabled={!doc}
          onChange={(e) => setScaleValue(e.target.value)}
          aria-label="Zoom"
          className="hidden h-8 w-28 rounded-lg border border-[var(--line)] bg-white px-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-[var(--charcoal)]/25 disabled:opacity-50 md:block"
        >
          {ZOOM_PRESETS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
          {ZOOM_LEVELS.map((level) => (
            <option key={level} value={String(level)}>
              {Math.round(level * 100)}%
            </option>
          ))}
          {!zoomIsListed && <option value={String(zoom.scale)}>{Math.round(zoom.scale * 100)}%</option>}
        </select>
        <IconButton label="Zoom in (Ctrl+=)" onClick={() => engine?.viewer.increaseScale()} disabled={!doc} className="hidden md:inline-flex">
          <ZoomIn className="h-4 w-4" />
        </IconButton>
        <IconButton label="Rotate counter-clockwise" onClick={() => rotate(-90)} disabled={!doc} className="hidden lg:inline-flex">
          <RotateCcw className="h-4 w-4" />
        </IconButton>
        <IconButton label="Rotate clockwise" onClick={() => rotate(90)} disabled={!doc} className="hidden lg:inline-flex">
          <RotateCw className="h-4 w-4" />
        </IconButton>

        <div className="min-w-2 flex-1" />

        {doc && !isXfa && (
          <div className="hidden items-center gap-0.5 rounded-full border border-[var(--line)] bg-[var(--soft)] p-0.5 lg:flex">
            <IconButton label="Highlight text" onClick={() => toggleEditor(EDITOR.HIGHLIGHT)} pressed={editorMode === EDITOR.HIGHLIGHT}>
              <Highlighter className="h-4 w-4" />
            </IconButton>
            <IconButton label="Add text note" onClick={() => toggleEditor(EDITOR.FREETEXT)} pressed={editorMode === EDITOR.FREETEXT}>
              <Type className="h-4 w-4" />
            </IconButton>
            <IconButton label="Draw" onClick={() => toggleEditor(EDITOR.INK)} pressed={editorMode === EDITOR.INK}>
              <PenLine className="h-4 w-4" />
            </IconButton>
          </div>
        )}
        <IconButton label="Find (Ctrl+F)" onClick={() => (findOpen ? setFindOpen(false) : openFind())} pressed={findOpen} disabled={!doc}>
          <Search className="h-4 w-4" />
        </IconButton>
        <Menu label="View options" icon={<BookOpen className="h-4 w-4" />} disabled={!doc}>
          {(close) => (
            <>
              <MenuSeparator label="Scrolling" />
              {(
                [
                  [ScrollMode.VERTICAL, 'Vertical', <Rows3 key="v" className="h-4 w-4" />],
                  [ScrollMode.HORIZONTAL, 'Horizontal', <StretchHorizontal key="h" className="h-4 w-4" />],
                  [ScrollMode.WRAPPED, 'Wrapped', <WrapText key="w" className="h-4 w-4" />],
                  [ScrollMode.PAGE, 'One page at a time', <FileText key="p" className="h-4 w-4" />],
                ] as Array<[number, string, React.ReactNode]>
              ).map(([mode, label, icon]) => (
                <MenuItem
                  key={mode}
                  icon={icon}
                  label={label}
                  checked={scrollMode === mode}
                  onSelect={() => {
                    if (engine) engine.viewer.scrollMode = mode;
                    close();
                  }}
                />
              ))}
              <MenuSeparator label="Spreads" />
              {(
                [
                  [SpreadMode.NONE, 'Single pages'],
                  [SpreadMode.ODD, 'Two-up (odd first, books)'],
                  [SpreadMode.EVEN, 'Two-up (even first)'],
                ] as Array<[number, string]>
              ).map(([mode, label]) => (
                <MenuItem
                  key={mode}
                  icon={<Columns2 className="h-4 w-4" />}
                  label={label}
                  checked={spreadMode === mode}
                  onSelect={() => {
                    if (engine) engine.viewer.spreadMode = mode;
                    close();
                  }}
                />
              ))}
              <MenuSeparator />
              <MenuItem
                icon={<Moon className="h-4 w-4" />}
                label="Night reading"
                hint="Inverts page colours"
                checked={nightMode}
                onSelect={() => setNightMode(!nightMode)}
              />
              <div className="lg:hidden">
                <MenuItem icon={<RotateCw className="h-4 w-4" />} label="Rotate clockwise" onSelect={() => rotate(90)} />
              </div>
            </>
          )}
        </Menu>
        <IconButton label="Document inspector" onClick={() => setInspectorOpen(!inspectorOpen)} pressed={inspectorOpen} disabled={!doc}>
          <Info className="h-4 w-4" />
        </IconButton>
        <Divider className="hidden sm:block" />
        <button
          type="button"
          onClick={save}
          disabled={!doc}
          title="Save a copy (Ctrl+S)"
          className="reader-chip-btn relative hidden h-8 sm:inline-flex"
        >
          <Save className="h-4 w-4" />
          <span className="hidden xl:inline">Save</span>
          {dirty && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--paper)] bg-orange-500" />}
        </button>
        <IconButton label="Print or save as standard PDF (Ctrl+P)" onClick={print} disabled={!doc} className="hidden sm:inline-flex">
          <Printer className="h-4 w-4" />
        </IconButton>
        <Menu label="More actions" icon={<MoreHorizontal className="h-4 w-4" />} disabled={!doc}>
          {(close) => (
            <>
              <div className="sm:hidden">
                <MenuItem icon={<Save className="h-4 w-4" />} label="Save a copy" onSelect={() => (close(), void save())} />
                <MenuItem icon={<Printer className="h-4 w-4" />} label="Print / save as PDF" onSelect={() => (close(), void print())} />
                <MenuSeparator />
              </div>
              <MenuItem
                icon={<FileJson className="h-4 w-4" />}
                label="Export form data"
                hint={fields.length ? `${fields.length} fields as JSON` : 'No form fields'}
                disabled={!fields.length}
                onSelect={() => (close(), exportFields())}
              />
              <MenuItem
                icon={<FileText className="h-4 w-4" />}
                label="Export text"
                hint="Plain text, page by page"
                onSelect={() => (close(), void exportText())}
              />
              <MenuItem icon={<Download className="h-4 w-4" />} label="Download original" onSelect={() => (close(), downloadOriginal())} />
              <MenuSeparator />
              <MenuItem
                icon={<FileSearch className="h-4 w-4" />}
                label="Document inspector"
                onSelect={() => (close(), setInspectorOpen(true))}
              />
            </>
          )}
        </Menu>
      </header>

      {isXfa && xfaNoticeOpen && (
        <div className="flex shrink-0 items-start gap-3 border-b border-amber-300 bg-amber-50 px-3 py-2 text-[13px] leading-snug text-amber-950 sm:px-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="flex-1">
            <strong>Dynamic XFA form.</strong>{' '}
            <span className="sm:hidden">
              Laid out by this reader. The form’s own scripts and buttons don’t run here, so check the saved copy in
              Adobe Reader before submitting.
            </span>
            <span className="hidden sm:inline">
              Most PDF viewers show only a “Please wait…” page for this file. This reader lays out the XFA template
              itself. The form’s own scripts don’t run here, so calculated fields and the form’s built-in buttons
              (Validate, Save, Print) won’t respond. Before an official submission, open the saved copy in Adobe
              Acrobat Reader to check it.
            </span>
          </p>
          <button type="button" onClick={() => setXfaNoticeOpen(false)} className="reader-icon-btn -my-1" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1">
        {/* Sidebar */}
        {doc && sidebarOpen && (
          <aside className="absolute inset-y-0 left-0 z-20 flex w-72 max-w-[85vw] flex-col border-r border-[var(--line)] bg-[var(--soft)] shadow-xl lg:static lg:shadow-none">
            <nav className="flex shrink-0 gap-1 border-b border-[var(--line)] p-2" aria-label="Sidebar">
              {sidebarTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSidebarTab(tab.id)}
                  aria-pressed={sidebarTab === tab.id}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-bold transition-colors ${
                    sidebarTab === tab.id
                      ? 'bg-[var(--accent)] ring-1 ring-[var(--ink)] ring-inset'
                      : 'text-[#474747] hover:bg-[#d0d0d0]'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.count !== undefined && <span className="tabular-nums opacity-70">{tab.count}</span>}
                </button>
              ))}
            </nav>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {sidebarTab === 'pages' && (
                <Thumbnails
                  doc={doc}
                  currentPage={page}
                  rotation={rotation}
                  formVersion={formVersion}
                  onSelect={(n) => {
                    goToPage(n);
                    if (isSmallScreen()) setSidebarOpen(false);
                  }}
                />
              )}
              {sidebarTab === 'outline' && (
                <div className="p-2">
                  <OutlineTree items={outline} onNavigate={navigateOutline} />
                </div>
              )}
              {sidebarTab === 'fields' && (
                <FieldsPanel doc={doc} fields={fields} formVersion={formVersion} onJump={jumpToField} onExport={exportFields} />
              )}
              {sidebarTab === 'attachments' && (
                <ul className="space-y-1 p-2">
                  {attachments.map((attachment, i) => (
                    <li key={`${attachment.filename}-${i}`}>
                      <button
                        type="button"
                        onClick={() => downloadBytes(attachment.content as BlobPart, attachment.filename, 'application/octet-stream')}
                        className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left hover:bg-[#d0d0d0]"
                        title="Download attachment"
                      >
                        <Paperclip className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold">{attachment.filename}</span>
                          <span className="block text-xs text-[#555]">
                            {(attachment.content.length / 1024).toFixed(1)} KB
                            {attachment.description ? ` · ${attachment.description}` : ''}
                          </span>
                        </span>
                        <Download className="mt-0.5 h-4 w-4 shrink-0 text-[#555]" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        )}

        {/* Viewer */}
        <main className="relative min-w-0 flex-1">
          {findOpen && engine && doc && <FindBar eventBus={engine.eventBus} focusSignal={findFocus} onClose={() => setFindOpen(false)} />}
          <div
            ref={containerRef}
            style={{ position: 'absolute' }}
            className={`reader-viewport inset-0 overflow-auto ${nightMode ? 'reader-night' : ''} ${
              editorMode !== EDITOR.NONE ? 'reader-editing' : ''
            }`}
          >
            <div ref={viewerRef} className="pdfViewer" />
          </div>

          {status !== 'ready' && (
            <div className="absolute inset-0 z-10 flex items-center justify-center overflow-y-auto bg-[var(--stage)] p-4">
              {status === 'loading' ? (
                <div className="w-full max-w-xs text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  <p className="mt-3 truncate text-sm font-semibold">Opening {file?.name}…</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#c4c4c4]">
                    <div className="h-full bg-[var(--charcoal)] transition-all" style={{ width: `${Math.round(loadProgress * 100)}%` }} />
                  </div>
                </div>
              ) : (
                <div className="editorial-sheet w-full max-w-xl p-6 sm:p-10">
                  {status === 'error' ? (
                    <>
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <h1 className="mt-4 text-xl font-bold">Couldn’t open {file?.name ?? 'this file'}</h1>
                      <p className="mt-2 text-sm text-[#555]">{error}</p>
                    </>
                  ) : (
                    <>
                      <span className="editorial-chip">
                        <ShieldCheck className="h-3.5 w-3.5" /> Runs entirely in your browser
                      </span>
                      <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Research-grade PDF reader</h1>
                      <p className="mt-3 text-[15px] leading-relaxed text-[#474747]">
                        Opens the PDFs ordinary viewers can’t, including dynamic XFA government forms such as the IRCC
                        IMM series that show only “Please wait…” in Chrome or Preview. Fill them in, search them, inspect
                        their internals and save or print a copy. Nothing is uploaded.
                      </p>
                      <ul className="mt-5 grid gap-2 text-[13px] font-medium text-[#333] sm:grid-cols-2">
                        {[
                          'XFA form layout engine',
                          'Fillable AcroForms + field list',
                          'Password-protected files',
                          'Search: case, whole word, accents',
                          'Metadata, permissions, SHA-256',
                          'Print or save as standard PDF',
                        ].map((feature) => (
                          <li key={feature} className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--charcoal)]" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="editorial-btn editorial-btn-dark">
                      <Upload className="h-4 w-4" /> {status === 'error' ? 'Try another file' : 'Choose a PDF'}
                    </button>
                    <span className="text-xs font-semibold text-[#666]">or drop it anywhere on this page</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Inspector */}
        {doc && inspectorOpen && (
          <aside className="absolute inset-y-0 right-0 z-20 w-80 max-w-[90vw] border-l border-[var(--line)] bg-[var(--paper)] shadow-xl xl:static xl:shadow-none">
            <InspectorPanel report={report} isXfa={isXfa} onClose={() => setInspectorOpen(false)} />
          </aside>
        )}
      </div>

      {/* Status bar */}
      {doc && file && (
        <footer className="hidden h-7 shrink-0 items-center gap-3 border-t border-[var(--line)] bg-[var(--paper)] px-3 text-[11px] font-semibold text-[#555] sm:flex">
          <span className="min-w-0 truncate text-[var(--ink)]">{file.name}</span>
          <span>
            {numPages} page{numPages === 1 ? '' : 's'}
          </span>
          <span className="rounded-full bg-[var(--soft)] px-2 py-0.5">
            {isXfa ? 'XFA layout' : report?.forms.technology === 'acroform' ? 'AcroForm' : 'PDF'}
          </span>
          {report?.security.encryption && <span>Encrypted ({report.security.encryption})</span>}
          <span className="flex-1" />
          {dirty && <span className="text-orange-700">Unsaved changes</span>}
          <span className="tabular-nums">{Math.round(zoom.scale * 100)}%</span>
        </footer>
      )}

      {passwordPrompt && (
        <PasswordDialog
          fileName={file?.name ?? 'This PDF'}
          retry={passwordPrompt.retry}
          onSubmit={passwordPrompt.submit}
          onCancel={passwordPrompt.cancel}
        />
      )}

      {busy && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xs rounded-3xl border border-[#cfcfcf] bg-[var(--paper)] p-6 text-center shadow-2xl" role="status">
            <Loader2 className="mx-auto h-6 w-6 animate-spin" />
            <p className="mt-3 text-sm font-semibold">{busy.label}</p>
            {busy.progress !== undefined && (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#c4c4c4]">
                <div className="h-full bg-[var(--charcoal)] transition-all" style={{ width: `${Math.round(busy.progress * 100)}%` }} />
              </div>
            )}
            {busy.cancel && (
              <button type="button" onClick={busy.cancel} className="editorial-btn editorial-btn-tonal mt-4 py-2">
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-10 left-1/2 z-[80] w-max max-w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl bg-[var(--charcoal)] px-5 py-2.5 text-center text-sm font-semibold text-white shadow-xl"
        >
          {toast}
        </div>
      )}

      {dragging && (
        <div className="pointer-events-none fixed inset-3 z-[90] flex items-center justify-center rounded-3xl border-2 border-dashed border-[var(--ink)] bg-[var(--accent)]/30 backdrop-blur-xs">
          <p className="rounded-full bg-[var(--paper)] px-5 py-2.5 text-sm font-bold shadow">Drop to open PDF</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          void openFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
