import type { PDFDocumentProxy } from 'pdfjs-dist';

export type FieldKind = 'text' | 'checkbox' | 'radio' | 'choice' | 'button' | 'signature' | 'other';

export interface FormField {
  /** Key into `doc.annotationStorage` (XFA data id or AcroForm annotation id). */
  id: string;
  name: string;
  label: string;
  kind: FieldKind;
  /** 1-based page number. */
  page: number;
  defaultValue: unknown;
  /** XFA only: value stored when a checkbox/radio is on. */
  onValue?: string;
  /** XFA only: `data-element-id` of the field wrapper in the rendered page. */
  elementId?: string;
  /** AcroForm only: widget rectangle in PDF user space. */
  rect?: number[];
  readOnly: boolean;
  /**
   * Whether a value typed here can be written into a saved PDF. pdf.js stores
   * XFA values in the form's data model; fields its binder leaves without a
   * data node (e.g. inside unnamed subforms) render and print but don't save.
   */
  savable: boolean;
}

interface XfaNode {
  name: string;
  attributes?: {
    class?: string[];
    dataId?: string;
    fieldId?: string;
    id?: string;
    xfaName?: string;
    type?: string;
    value?: string;
    checked?: unknown;
    selected?: unknown;
    xfaOn?: string;
    readOnly?: unknown;
  };
  children?: Array<XfaNode | null>;
  value?: string;
}

const MAX_LABEL = 180;

function textOf(node: XfaNode | null): string {
  if (!node || ['input', 'textarea', 'select', 'option'].includes(node.name)) return '';
  let text = node.value ?? '';
  for (const child of node.children ?? []) text += ' ' + textOf(child);
  return text;
}

function tidy(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > MAX_LABEL ? `${clean.slice(0, MAX_LABEL - 1)}…` : clean;
}

function xfaDefault(node: XfaNode): unknown {
  const attrs = node.attributes ?? {};
  switch (node.name) {
    case 'textarea':
      return node.children?.map((c) => c?.value ?? '').join('') || node.value || '';
    case 'select':
      return node.children?.find((o) => o?.attributes?.selected)?.attributes?.value ?? '';
    default:
      if (attrs.type === 'checkbox' || attrs.type === 'radio') {
        return attrs.checked ? attrs.xfaOn : null;
      }
      return attrs.value ?? '';
  }
}

/** Walks pdf.js' XFA→HTML tree; each root child is one laid-out page. */
export function collectXfaFields(allXfaHtml: unknown): FormField[] {
  const root = allXfaHtml as XfaNode | null;
  const fields = new Map<string, FormField>();
  root?.children?.forEach((pageNode, pageIndex) => {
    const walk = (node: XfaNode | null, ancestors: XfaNode[]) => {
      if (!node) return;
      const attrs = node.attributes;
      if (attrs?.dataId && ['input', 'textarea', 'select'].includes(node.name)) {
        if (fields.has(attrs.dataId)) return;
        const wrapper = [...ancestors].reverse().find((a) => a.attributes?.class?.includes('xfaField'));
        const kind: FieldKind =
          node.name === 'select'
            ? 'choice'
            : attrs.type === 'checkbox'
              ? 'checkbox'
              : attrs.type === 'radio'
                ? 'radio'
                : 'text';
        const name = wrapper?.attributes?.xfaName ?? attrs.dataId;
        fields.set(attrs.dataId, {
          id: attrs.dataId,
          name,
          label: tidy(textOf(wrapper ?? null)) || name,
          kind,
          page: pageIndex + 1,
          defaultValue: xfaDefault(node),
          onValue: attrs.xfaOn,
          elementId: wrapper?.attributes?.id,
          readOnly: !!attrs.readOnly || !!wrapper?.attributes?.class?.includes('xfaNonInteractive'),
          // Without a data node pdf.js falls back to the field's own id.
          savable: attrs.dataId !== attrs.fieldId,
        });
        return;
      }
      for (const child of node.children ?? []) walk(child, [...ancestors, node]);
    };
    walk(pageNode, []);
  });
  return [...fields.values()];
}

interface AcroFieldObject {
  id: string;
  type?: string;
  value?: unknown;
  defaultValue?: unknown;
  page?: number;
  rect?: number[];
  editable?: boolean;
  name?: string;
}

const ACRO_KINDS: Record<string, FieldKind> = {
  text: 'text',
  checkbox: 'checkbox',
  radiobutton: 'radio',
  combobox: 'choice',
  listbox: 'choice',
  button: 'button',
  signature: 'signature',
};

export async function collectFormFields(doc: PDFDocumentProxy): Promise<FormField[]> {
  if (doc.isPureXfa) return collectXfaFields(doc.allXfaHtml);
  const objects = (await doc.getFieldObjects()) as Record<string, AcroFieldObject[]> | null;
  if (!objects) return [];
  const fields: FormField[] = [];
  for (const [name, widgets] of Object.entries(objects)) {
    for (const widget of widgets) {
      // Parent (non-widget) entries have no page; they only carry the shared value.
      if (typeof widget.page !== 'number' || widget.page < 0) continue;
      fields.push({
        id: widget.id,
        name,
        label: name,
        kind: ACRO_KINDS[widget.type ?? ''] ?? 'other',
        page: widget.page + 1,
        defaultValue: widget.value ?? widget.defaultValue ?? '',
        rect: widget.rect,
        readOnly: widget.editable === false,
        savable: true,
      });
    }
  }
  return fields;
}

export function currentValue(doc: PDFDocumentProxy, field: FormField): unknown {
  return (doc.annotationStorage.getValue(field.id, { value: field.defaultValue }) as { value?: unknown }).value;
}

export function isFilled(field: FormField, value: unknown): boolean {
  if (field.kind === 'checkbox' || field.kind === 'radio') {
    return field.onValue !== undefined ? value === field.onValue : value === true || value === 'Yes' || value === 'On';
  }
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined && String(value).trim() !== '' && value !== 'Off';
}

export function formatValue(field: FormField, value: unknown): string {
  if (field.kind === 'checkbox' || field.kind === 'radio') return isFilled(field, value) ? 'Checked' : 'Unchecked';
  if (Array.isArray(value)) return value.join(', ');
  if (value === null || value === undefined) return '';
  return String(value);
}
