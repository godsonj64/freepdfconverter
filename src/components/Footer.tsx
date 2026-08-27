import React from 'react';
import { Layers, ShieldCheck, ArrowUp } from 'lucide-react';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="mt-40 border-t border-[#b8b8b8] pt-16 pb-12 bg-[#f4f4f1]">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex flex-col items-center md:items-start gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#313033] flex items-center justify-center text-white shadow-xs">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-[#151515]">
              Free<span className="text-[#313033]">PDF</span>Converter
            </span>
          </div>
          <p className="text-xs text-[#474747] max-w-sm text-center md:text-left">
            The free, private, browser-based continuous and paginated PDF studio for long screenshots, receipts, and web captures.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#474747] font-medium">
          <a href="#features" className="hover:text-[#313033] transition-colors">Engine Features</a>
          <a href="#comparison" className="hover:text-[#313033] transition-colors">Continuous Flow</a>
          <a href="#use-cases" className="hover:text-[#313033] transition-colors">Use Cases</a>
          <a href="#faq" className="hover:text-[#313033] transition-colors">FAQ</a>
          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex items-center gap-1 text-[#313033] font-semibold hover:text-[#0842A0] ml-2 cursor-pointer"
          >
            Back to Top
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-10 pt-6 border-t border-[#b8b8b8] flex flex-col md:flex-row items-center justify-between text-xs text-[#666666] gap-4">
        <div className="flex items-center gap-2 text-[#151515] text-center md:text-left">
          <ShieldCheck className="w-4 h-4 text-[#151515] shrink-0" />
          <span>Local Client-Side Processing • Zero Cloud Storage • Lossless Quality</span>
        </div>
        <div className="flex flex-col items-center md:items-end gap-1.5">
          <p className="font-medium">A product by Axiomatic Research. © {new Date().getFullYear()}</p>
          <a href="mailto:godson@axiomaticresearch.com" className="hover:text-[#151515] transition-colors underline decoration-[#b8b8b8] underline-offset-2">godson@axiomaticresearch.com</a>
        </div>
      </div>
    </footer>
  );
};

