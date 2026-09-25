import type { PDFDocumentProxy } from 'pdfjs-dist';
import { collectXfaFields } from './forms';
import { pdfjsLib } from './pdfjs';

export type FormTechnology = 'dynamic-xfa' | 'static-xfa' | 'acroform' | 'none';

export interface KeywordCount {
  keyword: string;
  count: number;
  /** Keywords that usually deserve a closer look (active content, launch actions…). */
  risky: boolean;
}

export interface DocumentReport {
  file: {
    name: string;
    size: number;
    sha256: string | null;
    fingerprints: string[];
    headerVersion: string | null;
    headerOffset: number;
  };
  info: {
    title: string | null;
    author: string | null;
    subject: string | null;
    keywords: string | null;
    creator: string | null;
    producer: string | null;
    created: Date | null;
    modified: Date | null;
    language: string | null;
    pdfVersion: string | null;
    linearized: boolean;
  };
  pages: {
    count: number;
    sizes: Array<{ label: string; count: number }>;
    labels: boolean;
  };
  forms: {
    technology: FormTechnology;
    fieldCount: number;
    needsRendering: boolean;
  };
  security: {
    encryption: string | null;
    /** `null` means the file sets no permission restrictions. */
    permissions: Array<{ label: string; allowed: boolean }> | null;
    signatures: boolean;
    usageRights: boolean;
    javascript: boolean;
  };
  structure: {
    tagged: boolean;
    outlineItems: number;
    attachments: number;
    eofMarkers: number;
    objectStreams: number;
    keywords: KeywordCount[];
  };
}

const PERMISSIONS: Array<[keyof typeof pdfjsLib.PermissionFlag, string]> = [
  ['PRINT', 'Print'],
  ['PRINT_HIGH_QUALITY', 'Print (high quality)'],
  ['COPY', 'Copy text & images'],
  ['COPY_FOR_ACCESSIBILITY', 'Extract for accessibility'],
  ['MODIFY_CONTENTS', 'Modify contents'],
  ['MODIFY_ANNOTATIONS', 'Add/modify annotations'],
  ['FILL_INTERACTIVE_FORMS', 'Fill form fields'],
  ['ASSEMBLE', 'Assemble (insert/rotate/delete pages)'],
];

// Name tokens in the spirit of Didier Stevens' pdfid. Dictionary keys are never
// encrypted, but anything stored inside a compressed /ObjStm is invisible here.
const NAME_KEYWORDS: Array<[string, boolean]> = [
  ['/Page', false],
  ['/Encrypt', false],
  ['/ObjStm', false],
  ['/JS', true],
  ['/JavaScript', true],
  ['/AA', true],
  ['/OpenAction', true],
  ['/Launch', true],
  ['/EmbeddedFile', true],
  ['/RichMedia', true],
  ['/JBIG2Decode', true],
  ['/URI', false],
  ['/AcroForm', false],
  ['/XFA', false],
  ['/NeedsRendering', false],
  ['/Perms', false],
  ['/UR3', false],
  ['/Sig', false],
];

const STANDARD_SIZES: Array<[string, number, number]> = [
  ['Letter', 612, 792],
  ['Legal', 612, 1008],
  ['Tabloid', 792, 1224],
  ['A5', 420, 595],
  ['A4', 595, 842],
  ['A3', 842, 1191],
];

/** Scanning is linear in file size; beyond this we only look at the head and tail. */
const MAX_SCAN_BYTES = 64 * 1024 * 1024;

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function describePageSize(width: number, height: number): string {
  const w = Math.round(width);
  const h = Math.round(height);
  const portrait = w <= h;
  const [short, long] = portrait ? [w, h] : [h, w];
  const named = STANDARD_SIZES.find(([, sw, sh]) => Math.abs(sw - short) <= 2 && Math.abs(sh - long) <= 2);
  const mm = `${Math.round((w * 25.4) / 72)} × ${Math.round((h * 25.4) / 72)} mm`;
  const orientation = portrait ? 'portrait' : 'landscape';
  return named ? `${named[0]}, ${orientation} (${mm})` : `${w} × ${h} pt, ${orientation} (${mm})`;
}

function latin1(bytes: Uint8Array): string {
  if (bytes.length <= MAX_SCAN_BYTES) {
    return new TextDecoder('latin1').decode(bytes);
  }
  const half = MAX_SCAN_BYTES / 2;
  const decoder = new TextDecoder('latin1');
  return decoder.decode(bytes.subarray(0, half)) + '\n' + decoder.decode(bytes.subarray(bytes.length - half));
}

function countMatches(haystack: string, pattern: RegExp): number {
  let count = 0;
  pattern.lastIndex = 0;
  while (pattern.exec(haystack)) count++;
  return count;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function scanKeywords(bytes: Uint8Array) {
  const raw = latin1(bytes);
  const header = /%PDF-(\d\.\d)/.exec(raw.slice(0, 1024));
  const keywords: KeywordCount[] = NAME_KEYWORDS.map(([keyword, risky]) => ({
    keyword,
    risky,
    count: countMatches(raw, new RegExp(`${escapeRegExp(keyword)}(?![A-Za-z0-9#])`, 'g')),
  }));
  for (const token of ['obj', 'stream', 'xref', 'trailer', 'startxref']) {
    keywords.unshift({
      keyword: token,
      risky: false,
      count: countMatches(raw, new RegExp(`(?<![A-Za-z0-9])${token}(?![A-Za-z0-9])`, 'g')),
    });
  }
  return {
    headerVersion: header ? header[1] : null,
    headerOffset: header ? header.index : -1,
    eofMarkers: countMatches(raw, /%%EOF/g),
    keywords,
  };
}

async function sha256(bytes: Uint8Array): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function countOutline(items: Array<{ items?: unknown[] }> | null): number {
  if (!items) return 0;
  return items.reduce((total, item) => total + 1 + countOutline((item.items as Array<{ items?: unknown[] }>) ?? null), 0);
}

export async function inspectDocument(
  doc: PDFDocumentProxy,
  bytes: Uint8Array,
  fileName: string,
): Promise<DocumentReport> {
  const [metadata, permissions, markInfo, outline, attachments, pageLabels, jsActions, fieldObjects, hash] =
    await Promise.all([
      doc.getMetadata(),
      doc.getPermissions(),
      doc.getMarkInfo(),
      doc.getOutline(),
      doc.getAttachments(),
      doc.getPageLabels(),
      doc.getJSActions(),
      doc.getFieldObjects(),
      sha256(bytes),
    ]);
  const info = metadata.info as Record<string, unknown>;
  const xmp = metadata.metadata;
  const scan = scanKeywords(bytes);
  const keywordCount = (name: string) => scan.keywords.find((k) => k.keyword === name)?.count ?? 0;

  const sizeCounts = new Map<string, number>();
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const [x0, y0, x1, y1] = page.view;
    const rotated = page.rotate % 180 !== 0;
    const label = describePageSize(rotated ? y1 - y0 : x1 - x0, rotated ? x1 - x0 : y1 - y0);
    sizeCounts.set(label, (sizeCounts.get(label) ?? 0) + 1);
  }

  const hasXfa = info.IsXFAPresent === true;
  const technology: FormTechnology = doc.isPureXfa
    ? 'dynamic-xfa'
    : hasXfa
      ? 'static-xfa'
      : info.IsAcroFormPresent === true
        ? 'acroform'
        : 'none';

  let fieldCount = fieldObjects ? Object.keys(fieldObjects).length : 0;
  if (doc.isPureXfa) fieldCount = collectXfaFields(doc.allXfaHtml).length;

  const toDate = (value: unknown) => (typeof value === 'string' ? pdfjsLib.PDFDateString.toDateObject(value) : null);

  return {
    file: {
      name: fileName,
      size: bytes.length,
      sha256: hash,
      fingerprints: doc.fingerprints.filter((f): f is string => !!f),
      headerVersion: scan.headerVersion,
      headerOffset: scan.headerOffset,
    },
    info: {
      title: asString(xmp?.get('dc:title')) ?? asString(info.Title),
      author: asString(info.Author) ?? asString(xmp?.get('dc:creator')),
      subject: asString(info.Subject),
      keywords: asString(info.Keywords),
      creator: asString(info.Creator),
      producer: asString(info.Producer),
      created: toDate(info.CreationDate),
      modified: toDate(info.ModDate),
      language: asString(info.Language),
      pdfVersion: asString(info.PDFFormatVersion),
      linearized: info.IsLinearized === true,
    },
    pages: {
      count: doc.numPages,
      sizes: [...sizeCounts].map(([label, count]) => ({ label, count })),
      labels: !!pageLabels,
    },
    forms: {
      technology,
      fieldCount,
      needsRendering: keywordCount('/NeedsRendering') > 0 || doc.isPureXfa,
    },
    security: {
      encryption: asString(info.EncryptFilterName),
      permissions: permissions
        ? PERMISSIONS.map(([flag, label]) => ({ label, allowed: permissions.includes(pdfjsLib.PermissionFlag[flag]) }))
        : null,
      signatures: info.IsSignaturesPresent === true,
      usageRights: keywordCount('/UR3') > 0,
      javascript: !!jsActions || keywordCount('/JS') > 0 || keywordCount('/JavaScript') > 0,
    },
    structure: {
      tagged: !!markInfo?.Marked,
      outlineItems: countOutline(outline),
      attachments: attachments ? Object.keys(attachments).length : 0,
      eofMarkers: scan.eofMarkers,
      objectStreams: keywordCount('/ObjStm'),
      keywords: scan.keywords,
    },
  };
}
