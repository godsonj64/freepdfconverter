import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    question: "What makes FreePDFConverter different from standard PDF converters?",
    answer: "Traditional PDF tools force your images into rigid page splits (e.g. 297mm height), often slicing text lines, tables, and receipts directly in half. FreePDFConverter specializes in Single Continuous Canvas PDFs that stitch multiple scrolling screenshots into one continuous, natural document with zero page breaks.",
  },
  {
    question: "Are my sensitive images or screenshots uploaded to a cloud server?",
    answer: "No. All image stitching, rotation, margin calculations, and PDF generation execute 100% locally in your browser using client-side WebAssembly and HTML5 Canvas. Your files and photos never touch an external cloud server.",
  },
  {
    question: "How does the Clipboard Paste (Ctrl+V / Cmd+V) feature work?",
    answer: "Whenever you take a screenshot with your OS tool (like Snipping Tool on Windows or Cmd+Ctrl+Shift+4 on Mac), you can simply press Ctrl+V or Cmd+V anywhere on the FreePDFConverter page. The app immediately imports the clipboard image into your conversion queue.",
  },
  {
    question: "What image formats and file types are supported?",
    answer: "FreePDFConverter supports PNG, JPEG/JPG, WebP, GIF, SVG, and BMP. You can also capture full scrolling web pages directly by entering any public URL.",
  },
  {
    question: "Can I choose between a single continuous scroll and standard A4/Letter pages?",
    answer: "Yes! In the PDF Configuration panel, you can choose between Continuous (single infinite canvas), Paginated A4 (210×297mm), or Paginated US Letter (8.5×11in). You can also add page numbers and custom timestamps.",
  },
  {
    question: "Is FreePDFConverter truly 100% free with no watermark or limits?",
    answer: "Yes. There are no watermarks, no account registration requirements, and no hidden subscriptions. It is completely free to use without restrictions.",
  },
];

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  // Advanced SEO: Generate FAQPage Structured Data (JSON-LD) dynamically
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": FAQ_DATA.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <section id="faq" className="max-w-4xl mx-auto py-12">
      {/* Injecting JSON-LD directly into the DOM for Googlebot */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-1.5 editorial-chip mb-3 text-xs bg-[#daf200] text-[#151515] border-none font-semibold">
          <HelpCircle className="w-3.5 h-3.5 text-[#313033]" />
          <span>Frequently Asked Questions</span>
        </div>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-[#151515]">
          Everything You Need to Know
        </h2>
        <p className="text-[#474747] max-w-md mx-auto mt-3 text-sm">
          Technical specifications, privacy guarantees, and continuous layout details.
        </p>
      </div>

      <div className="space-y-3">
        {FAQ_DATA.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className={`bg-[#f4f4f1] border rounded-2xl overflow-hidden transition-all duration-200 ${
                isOpen ? 'border-[#0B57D0] shadow-sm' : 'border-[#b8b8b8] hover:border-[#aaa]'
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(index)}
                className="w-full px-6 py-4.5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-[#151515] hover:bg-[#f4f4f1] transition-colors cursor-pointer"
              >
                <span>{faq.question}</span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-200 flex-shrink-0 ${
                  isOpen ? 'rotate-180 bg-[#daf200] text-[#313033]' : 'bg-[#dedede] text-[#474747]'
                }`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-[#474747] leading-relaxed border-t border-[#F0F4F9]">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
};

