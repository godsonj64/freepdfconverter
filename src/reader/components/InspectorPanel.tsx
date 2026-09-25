import React, { useState } from 'react';
import { AlertTriangle, Check, Copy, Loader2, X } from 'lucide-react';
import type { DocumentReport, FormTechnology } from '../inspect';
import { pdfjsLib } from '../pdfjs';

const TECHNOLOGY: Record<FormTechnology, string> = {
  'dynamic-xfa': 'Dynamic XFA (Adobe LiveCycle)',
  'static-xfa': 'Static XFA with AcroForm fallback',
  acroform: 'AcroForm',
  none: 'No interactive form',
};

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 ** 2).toFixed(2)} MB`;
}

function formatDate(date: Date | null) {
  return date ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : null;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="border-b border-[var(--line)] px-4 py-4">
    <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-[#666]">{title}</h3>
    <dl className="space-y-1.5 text-[13px]">{children}</dl>
  </section>
);

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) =>
  value === null || value === undefined || value === '' ? null : (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2">
      <dt className="text-[#666]">{label}</dt>
      <dd className="min-w-0 break-words font-medium">{value}</dd>
    </div>
  );

const Flag: React.FC<{ on: boolean; warn?: boolean }> = ({ on, warn }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
      on ? (warn ? 'bg-amber-100 text-amber-900' : 'bg-[var(--accent)] text-[var(--ink)]') : 'bg-[var(--soft)] text-[#555]'
    }`}
  >
    {on ? 'Yes' : 'No'}
  </span>
);

interface InspectorPanelProps {
  report: DocumentReport | null;
  isXfa: boolean;
  onClose: () => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({ report, isXfa, onClose }) => {
  const [copied, setCopied] = useState(false);

  const copyReport = async () => {
    if (!report) return;
    await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--line)] px-4">
        <h2 className="text-sm font-bold">Document inspector</h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={copyReport} disabled={!report} className="reader-chip-btn" title="Copy report as JSON">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy JSON'}
          </button>
          <button type="button" onClick={onClose} className="reader-icon-btn" aria-label="Close inspector">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!report ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-[#555]">
          <Loader2 className="h-4 w-4 animate-spin" /> Analysing…
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <Section title="File">
            <Row label="Name" value={report.file.name} />
            <Row label="Size" value={`${formatBytes(report.file.size)} (${report.file.size.toLocaleString()} bytes)`} />
            <Row
              label="SHA-256"
              value={report.file.sha256 && <code className="break-all font-mono text-[11px]">{report.file.sha256}</code>}
            />
            <Row
              label="File ID"
              value={
                report.file.fingerprints.length > 0 && (
                  <code className="break-all font-mono text-[11px]">{report.file.fingerprints.join(' · ')}</code>
                )
              }
            />
            <Row
              label="Header"
              value={
                report.file.headerVersion
                  ? `%PDF-${report.file.headerVersion}${report.file.headerOffset > 0 ? ` at byte ${report.file.headerOffset}` : ''}`
                  : 'Missing %PDF header'
              }
            />
          </Section>

          <Section title="Document">
            <Row label="Title" value={report.info.title} />
            <Row label="Author" value={report.info.author} />
            <Row label="Subject" value={report.info.subject} />
            <Row label="Keywords" value={report.info.keywords} />
            <Row label="Created" value={formatDate(report.info.created)} />
            <Row label="Modified" value={formatDate(report.info.modified)} />
            <Row label="Creator" value={report.info.creator} />
            <Row label="Producer" value={report.info.producer} />
            <Row label="Language" value={report.info.language} />
            <Row label="PDF version" value={report.info.pdfVersion} />
            <Row label="Fast web view" value={<Flag on={report.info.linearized} />} />
          </Section>

          <Section title="Pages">
            <Row label="Count" value={report.pages.count} />
            {report.pages.sizes.map(({ label, count }) => (
              <Row key={label} label={count === report.pages.count ? 'Size' : `${count} page${count > 1 ? 's' : ''}`} value={label} />
            ))}
            <Row label="Page labels" value={<Flag on={report.pages.labels} />} />
          </Section>

          <Section title="Forms">
            <Row label="Technology" value={TECHNOLOGY[report.forms.technology]} />
            <Row label="Fields" value={report.forms.fieldCount} />
            <Row label="Needs rendering" value={<Flag on={report.forms.needsRendering} warn />} />
            {isXfa && (
              <p className="mt-2 rounded-lg bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-900">
                The page content lives in an XFA template, not in PDF page streams. Chrome, Edge, macOS Preview and
                most mobile viewers show only the “Please wait…” placeholder page. This reader lays the template out
                itself.
              </p>
            )}
          </Section>

          <Section title="Security">
            <Row label="Encryption" value={report.security.encryption ?? 'None'} />
            {report.security.permissions ? (
              <div className="grid grid-cols-[7.5rem_1fr] gap-2">
                <dt className="text-[#666]">Permissions</dt>
                <dd className="space-y-1">
                  {report.security.permissions.map(({ label, allowed }) => (
                    <div key={label} className="flex items-center gap-1.5 text-xs">
                      {allowed ? <Check className="h-3.5 w-3.5 text-green-700" /> : <X className="h-3.5 w-3.5 text-red-600" />}
                      <span className={allowed ? '' : 'text-[#777] line-through'}>{label}</span>
                    </div>
                  ))}
                </dd>
              </div>
            ) : (
              <Row label="Permissions" value="Unrestricted" />
            )}
            <Row label="Signatures" value={<Flag on={report.security.signatures} />} />
            <Row label="Usage rights" value={<Flag on={report.security.usageRights} />} />
            <Row label="JavaScript" value={<Flag on={report.security.javascript} warn />} />
            <p className="mt-2 text-xs leading-relaxed text-[#555]">
              Embedded JavaScript, FormCalc and launch actions are never executed by this reader.
            </p>
          </Section>

          <Section title="Structure">
            <Row label="Tagged" value={<Flag on={report.structure.tagged} />} />
            <Row label="Outline items" value={report.structure.outlineItems} />
            <Row label="Attachments" value={report.structure.attachments} />
            <Row label="%%EOF markers" value={report.structure.eofMarkers} />
            <div className="pt-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[#666]">
                    <th className="pb-1 font-semibold">Raw token</th>
                    <th className="pb-1 text-right font-semibold">Count</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {report.structure.keywords.map(({ keyword, count, risky }) => (
                    <tr key={keyword} className={count > 0 && risky ? 'text-amber-800' : count === 0 ? 'text-[#999]' : ''}>
                      <td className="py-0.5">
                        {keyword}
                        {count > 0 && risky && <AlertTriangle className="ml-1 inline h-3 w-3 align-[-1px]" />}
                      </td>
                      <td className="py-0.5 text-right tabular-nums">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.structure.objectStreams > 0 && (
                <p className="mt-2 text-xs leading-relaxed text-[#555]">
                  {report.structure.objectStreams} compressed object stream
                  {report.structure.objectStreams > 1 ? 's hide' : ' hides'} part of the file from a raw token scan,
                  so a count of 0 above is not proof of absence.
                </p>
              )}
            </div>
          </Section>

          <Section title="Engine">
            <Row label="Renderer" value={`pdf.js ${pdfjsLib.version}`} />
            <Row label="Layout path" value={isXfa ? 'XFA template → HTML' : 'Canvas + text layer'} />
          </Section>
        </div>
      )}
    </div>
  );
};
