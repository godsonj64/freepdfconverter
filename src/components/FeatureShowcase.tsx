import React, { useState } from 'react';
import { 
  Layers, 
  Scissors, 
  ShieldCheck, 
  Globe, 
  Clipboard, 
  FileCheck, 
  Check, 
  MessageSquare, 
  FileText, 
  Receipt, 
  LayoutDashboard,
  Sliders,
  Maximize2
} from 'lucide-react';

export const FeatureShowcase: React.FC = () => {
  const [comparisonMode, setComparisonMode] = useState<'continuous' | 'traditional'>('continuous');

  return (
    <div className="space-y-28">
      {/* Visual Comparison Section */}
      <section id="comparison" className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 editorial-chip mb-3 text-xs bg-[#daf200] text-[#151515] border-none font-semibold">
            <Layers className="w-3.5 h-3.5 text-[#313033]" />
            <span>Continuous vs. Traditional Splitting</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-[#151515]">
            Never Let Arbitrary Page Breaks <br />
            <span className="text-[#313033]">Chop Your Content Again.</span>
          </h2>
          <p className="text-[#474747] max-w-xl mx-auto mt-4 text-sm sm:text-base leading-relaxed">
            Standard PDF converters force screenshots into rigid A4/Letter boundaries, slicing tables, text lines, and invoices in half. FreePDFConverter stitches them into a singular, continuous document.
          </p>

          <div className="flex justify-center gap-2 mt-6">
            <div className="editorial-segmented">
              <button
                type="button"
                onClick={() => setComparisonMode('continuous')}
                className={`editorial-segmented-item ${comparisonMode === 'continuous' ? 'active' : ''}`}
              >
                {comparisonMode === 'continuous' && <Check className="w-3.5 h-3.5" />}
                Continuous Canvas
              </button>
              <button
                type="button"
                onClick={() => setComparisonMode('traditional')}
                className={`editorial-segmented-item ${comparisonMode === 'traditional' ? 'active' : ''}`}
              >
                {comparisonMode === 'traditional' && <Check className="w-3.5 h-3.5" />}
                Traditional Sliced
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Comparison Mockup */}
        <div className="bg-[#f4f4f1] border border-[#b8b8b8] rounded-[1.8vw] p-8 sm:p-12 shadow-sm overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                comparisonMode === 'continuous'
                  ? 'bg-[#daf200] text-[#151515]'
                  : 'bg-[#ffcdd2] text-[#d32f2f]'
              }`}>
                {comparisonMode === 'continuous' ? 'Continuous Canvas' : 'Traditional Page Slicing'}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-[#151515]">
              {comparisonMode === 'continuous'
                ? 'Smooth, unbroken canvas that preserves natural layout'
                : 'Unnatural cuts slicing right through rows & conversations'}
            </h3>
            <p className="text-sm text-[#474747] leading-relaxed">
              {comparisonMode === 'continuous'
                ? 'Whether archiving a 20-screen mobile chat, a full-page design portfolio, or financial statements, content retains its original proportions with zero horizontal seam cuts.'
                : 'Traditional engines blindly cut at 297mm intervals, leaving orphaned sentences, split invoices, and half-severed charts.'}
            </p>
            <ul className="space-y-2 text-xs font-medium pt-2">
              {comparisonMode === 'continuous' ? (
                <>
                  <li className="flex items-center gap-2 text-[#151515]">
                    <Check className="w-4 h-4 text-[#151515]" /> 100% pixel-calibrated width alignment
                  </li>
                  <li className="flex items-center gap-2 text-[#151515]">
                    <Check className="w-4 h-4 text-[#151515]" /> Infinite single vertical canvas without page cuts
                  </li>
                  <li className="flex items-center gap-2 text-[#151515]">
                    <Check className="w-4 h-4 text-[#151515]" /> High-density lossless compression engine
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-center gap-2 text-[#d32f2f]">
                    <Scissors className="w-4 h-4" /> Splits receipts and tables right across numbers
                  </li>
                  <li className="flex items-center gap-2 text-[#d32f2f]">
                    <Scissors className="w-4 h-4" /> Wastes blank whitespace at bottom margins
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Visual simulation preview with clean M3 paper container */}
          <div className="w-full md:w-80 h-96 bg-[#dedede] rounded-2xl border border-[#b8b8b8] p-4 flex flex-col justify-center items-center relative overflow-hidden shadow-inner">
            {comparisonMode === 'continuous' ? (
              <div className="w-60 h-84 bg-white rounded-2xl shadow-md border border-[#b8b8b8] p-3.5 space-y-2.5 overflow-hidden flex flex-col">
                <div className="h-6 bg-[#041E49] rounded-lg w-3/4 flex items-center px-2">
                  <div className="w-2 h-2 rounded-full bg-[#146C2E] mr-1.5" />
                  <div className="h-1.5 bg-[#daf200] rounded w-16" />
                </div>
                <div className="h-18 bg-[#f4f4f1] border border-[#b8b8b8] rounded-xl p-2.5 flex flex-col justify-center gap-1.5">
                  <div className="h-2 bg-[#C4C7C5] rounded w-5/6" />
                  <div className="h-2 bg-[#E1E7F0] rounded w-1/2" />
                </div>
                <div className="h-22 bg-[#daf200]/50 border border-[#D3E3FD] rounded-xl p-2.5 flex flex-col justify-center gap-1.5">
                  <div className="h-2 bg-[#313033]/60 rounded w-full" />
                  <div className="h-2 bg-[#313033]/40 rounded w-4/5" />
                </div>
                <div className="h-20 bg-[#f4f4f1] border border-[#b8b8b8] rounded-xl p-2.5 flex flex-col justify-center gap-1.5">
                  <div className="h-2 bg-[#C4C7C5] rounded w-3/4" />
                  <div className="h-2 bg-[#E1E7F0] rounded w-2/3" />
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="w-60 h-38 bg-white rounded-2xl shadow-sm border border-[#b8b8b8] p-3 space-y-2 relative overflow-hidden">
                  <div className="h-4 bg-[#041E49] rounded-md w-3/4" />
                  <div className="h-14 bg-[#f4f4f1] rounded p-2" />
                  <div className="absolute bottom-0 inset-x-0 h-5 bg-[#ffcdd2] border-t border-dashed border-[#BA1A1A] text-[10px] text-[#d32f2f] text-center font-bold flex items-center justify-center">
                    Page Break Cut Slices Content
                  </div>
                </div>
                <div className="w-60 h-36 bg-white rounded-2xl shadow-sm border border-[#b8b8b8] p-3 space-y-2 relative overflow-hidden">
                  <div className="h-10 bg-[#f4f4f1] rounded p-2" />
                  <div className="h-3.5 bg-[#C4C7C5] rounded w-1/2" />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Core Highlights Grid */}
      <section id="features" className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-[#151515]">
            Engineered for Precision & Speed
          </h2>
          <p className="text-[#474747] max-w-lg mx-auto mt-3 text-sm">
            Everything compiles locally on your hardware with zero data retention and maximum performance.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-[#f4f4f1] border border-[#b8b8b8] rounded-[1.8vw] p-7 hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[#daf200] text-[#313033] flex items-center justify-center mb-5">
              <Clipboard className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-[#151515] mb-2">Instant Clipboard Paste</h3>
            <p className="text-sm text-[#474747] leading-relaxed">
              Simply press <kbd className="px-2 py-0.5 text-xs bg-[#dedede] border border-[#aaa] rounded-md font-mono font-bold text-[#151515]">Ctrl+V</kbd> anywhere to paste captured screenshots directly from your system buffer into your sequence.
            </p>
          </div>

          <div className="bg-[#f4f4f1] border border-[#b8b8b8] rounded-[1.8vw] p-7 hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[#daf200] text-[#313033] flex items-center justify-center mb-5">
              <Globe className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-[#151515] mb-2">Live Webpage Parser</h3>
            <p className="text-sm text-[#474747] leading-relaxed">
              Capture any public webpage as one full-length image, at Desktop, Tablet, or Mobile width, in light or dark mode.
            </p>
          </div>

          <div className="bg-[#f4f4f1] border border-[#b8b8b8] rounded-[1.8vw] p-7 hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-2xl bg-[#daf200] text-[#151515] flex items-center justify-center mb-5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-lg text-[#151515] mb-2">100% Private & In-Browser</h3>
            <p className="text-sm text-[#474747] leading-relaxed">
              Your sensitive financial receipts, legal chat records, and documents never leave your machine. Canvas rendering runs completely on client hardware.
            </p>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="use-cases" className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-[#151515]">
            Crafted for Mission-Critical Documents
          </h2>
          <p className="text-[#474747] max-w-lg mx-auto mt-3 text-sm">
            Whether archiving legal conversations or compiling executive presentation dossiers.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#f4f4f1] border border-[#b8b8b8] rounded-[1.8vw] flex flex-col overflow-hidden hover:shadow-md transition-all h-[400px]">
            <div className="p-6 flex flex-col flex-grow">
              <div className="w-10 h-10 rounded-xl bg-[#daf200] text-[#313033] flex items-center justify-center mb-4 shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-[#151515] text-base mb-1.5 shrink-0">Chat Logs & Evidence</h4>
              <p className="text-xs text-[#474747] leading-relaxed mb-4">
                Stitch iMessage, Slack, WhatsApp, and Telegram threads into court-ready records with unbroken continuity.
              </p>
              <div className="mt-auto pt-3 border-t border-[#b8b8b8] text-xs font-semibold text-[#313033]">
                Continuous Flow &rarr;
              </div>
            </div>
            <div className="h-[45%] w-full shrink-0">
              <img
                loading="lazy"
                decoding="async"
                src="/vecteezy_forest-mountain-and-lake-landscape-at-sunrise-and-sunset_8277940.jpg" 
                alt="Chat Logs landscape" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="bg-[#f4f4f1] border border-[#b8b8b8] rounded-[1.8vw] flex flex-col overflow-hidden hover:shadow-md transition-all h-[400px]">
            <div className="p-6 flex flex-col flex-grow">
              <div className="w-10 h-10 rounded-xl bg-[#daf200] text-[#313033] flex items-center justify-center mb-4 shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-[#151515] text-base mb-1.5 shrink-0">Receipts & Invoices</h4>
              <p className="text-xs text-[#474747] leading-relaxed mb-4">
                Combine long checkout summaries, gas receipts, and expense screenshots with zero margin cuts.
              </p>
              <div className="mt-auto pt-3 border-t border-[#b8b8b8] text-xs font-semibold text-[#313033]">
                Zero Margin Mode &rarr;
              </div>
            </div>
            <div className="h-[45%] w-full shrink-0">
              <img
                loading="lazy"
                decoding="async"
                src="/vecteezy_vector-red-horizontal-landscape-with-fog-forest-christmas_7162598-1.jpg" 
                alt="Receipts landscape" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="bg-[#f4f4f1] border border-[#b8b8b8] rounded-[1.8vw] flex flex-col overflow-hidden hover:shadow-md transition-all h-[400px]">
            <div className="p-6 flex flex-col flex-grow">
              <div className="w-10 h-10 rounded-xl bg-[#daf200] text-[#313033] flex items-center justify-center mb-4 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-[#151515] text-base mb-1.5 shrink-0">Articles & Research</h4>
              <p className="text-xs text-[#474747] leading-relaxed mb-4">
                Archive long technical papers, blogs, and Substack posts into easily searchable, pristine PDFs.
              </p>
              <div className="mt-auto pt-3 border-t border-[#b8b8b8] text-xs font-semibold text-[#313033]">
                Paginated or Continuous &rarr;
              </div>
            </div>
            <div className="h-[45%] w-full shrink-0">
              <img
                loading="lazy"
                decoding="async"
                src="/vecteezy_stunning-mountain-and-lake-sunset-landscape-high-quality_48729997.jpg" 
                alt="Research landscape" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="bg-[#f4f4f1] border border-[#b8b8b8] rounded-[1.8vw] flex flex-col overflow-hidden hover:shadow-md transition-all h-[400px]">
            <div className="p-6 flex flex-col flex-grow">
              <div className="w-10 h-10 rounded-xl bg-[#daf200] text-[#313033] flex items-center justify-center mb-4 shrink-0">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-[#151515] text-base mb-1.5 shrink-0">Design Mockups</h4>
              <p className="text-xs text-[#474747] leading-relaxed mb-4">
                Export full Figma artboards, landing page designs, and web mockups into client presentation PDFs.
              </p>
              <div className="mt-auto pt-3 border-t border-[#b8b8b8] text-xs font-semibold text-[#313033]">
                Lossless Ultra HD &rarr;
              </div>
            </div>
            <div className="h-[45%] w-full shrink-0">
              <img
                loading="lazy"
                decoding="async"
                src="/vecteezy_breathtaking-snowy-mountain-range-illuminated-by-the-sun_48936116.jpg" 
                alt="Design Mockups landscape" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
