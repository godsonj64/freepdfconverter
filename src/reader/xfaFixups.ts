/**
 * Government XFA forms (IRCC's IMM series, for one) use Wingdings 2 glyphs for
 * check boxes in their instructions, e.g. "check R each item" where R is ☑.
 * Browsers don't ship Wingdings, so pdf.js substitutes its generic fallback
 * face and the raw letter shows. We map isolated single-glyph runs in that
 * fallback face to the Unicode symbol; longer runs are left alone since they
 * are more likely to be ordinary text in some other missing font.
 */
const WINGDINGS2_TO_UNICODE: Record<string, string> = {
  O: '✗', // ✗
  P: '✓', // ✓
  R: '☑', // ☑
  S: '☒', // ☒
  T: '☒', // ☒
  '£': '☐', // £ → ☐
};

const SYMBOL_FONT_STACK = '"Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols 2", "DejaVu Sans", sans-serif';

interface XfaHtmlNode {
  name: string;
  attributes?: { style?: Record<string, unknown> };
  children?: Array<XfaHtmlNode | null>;
  value?: string;
}

/** Mutates pdf.js' XFA HTML tree in place; call before the pages render. */
export function repairXfaSymbolGlyphs(allXfaHtml: unknown): number {
  let repaired = 0;
  const stack = [allXfaHtml as XfaHtmlNode | null];
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    const style = node.attributes?.style;
    const family = typeof style?.fontFamily === 'string' ? style.fontFamily : '';
    const glyph = node.value?.trim();
    if (style && family.includes('PdfJS-Fallback') && glyph && glyph.length === 1 && WINGDINGS2_TO_UNICODE[glyph]) {
      node.value = node.value!.replace(glyph, WINGDINGS2_TO_UNICODE[glyph]);
      style.fontFamily = SYMBOL_FONT_STACK;
      repaired++;
    }
    if (node.children) stack.push(...node.children);
  }
  return repaired;
}
