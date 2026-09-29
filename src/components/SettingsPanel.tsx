import React from 'react';
import { Sliders, FileText, Layout, Maximize2, Hash, Clock, FileCode, Check } from 'lucide-react';
import { ConversionSettings, LayoutMode, MarginOption, QualityOption } from '../types';

interface SettingsPanelProps {
  settings: ConversionSettings;
  onChange: (settings: ConversionSettings) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onChange }) => {
  const updateSetting = <K extends keyof ConversionSettings>(key: K, value: ConversionSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="bg-[#f4f4f1] border border-[#aaa] rounded-[1.8vw] p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-[#b8b8b8]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#daf200] text-[#151515] flex items-center justify-center">
            <Sliders className="w-4 h-4 text-[#313033]" />
          </div>
          <div>
            <h3 className="font-bold text-[#151515] text-sm">PDF Engine Configuration</h3>
            <p className="text-xs text-[#474747]">Fine-tune canvas layout, compression density, and margins</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Layout Mode */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-[#151515] flex items-center gap-1.5">
            <Layout className="w-3.5 h-3.5 text-[#313033]" />
            Document Layout Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { id: 'continuous' as LayoutMode, label: 'Continuous', sub: 'Single canvas' },
              { id: 'paginated_a4' as LayoutMode, label: 'A4 Pages', sub: '210×297mm' },
              { id: 'paginated_letter' as LayoutMode, label: 'US Letter', sub: '8.5×11in' },
            ].map((mode) => {
              const active = settings.layoutMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => updateSetting('layoutMode', mode.id)}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    active
                      ? 'border-[#0B57D0] bg-[#daf200]/60 text-[#151515] shadow-xs'
                      : 'border-[#b8b8b8] bg-[#f4f4f1] hover:bg-[#dedede] text-[#151515]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs font-bold ${active ? 'text-[#313033]' : 'text-[#151515]'}`}>
                      {mode.label}
                    </span>
                    {active && <Check className="w-3.5 h-3.5 text-[#313033]" />}
                  </div>
                  <span className="text-[10px] text-[#474747] mt-1 leading-tight">{mode.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quality & Compression */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-[#151515] flex items-center gap-1.5">
            <Maximize2 className="w-3.5 h-3.5 text-[#313033]" />
            Quality & Compression
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { id: 'maximum' as QualityOption, label: 'Ultra HD', sub: 'Lossless PNG' },
              { id: 'high' as QualityOption, label: 'High (92%)', sub: 'Balanced JPEG' },
              { id: 'compressed' as QualityOption, label: 'Compact', sub: 'Email Friendly' },
            ].map((q) => {
              const active = settings.quality === q.id;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => updateSetting('quality', q.id)}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    active
                      ? 'border-[#0B57D0] bg-[#daf200]/60 text-[#151515] shadow-xs'
                      : 'border-[#b8b8b8] bg-[#f4f4f1] hover:bg-[#dedede] text-[#151515]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs font-bold ${active ? 'text-[#313033]' : 'text-[#151515]'}`}>
                      {q.label}
                    </span>
                    {active && <Check className="w-3.5 h-3.5 text-[#313033]" />}
                  </div>
                  <span className="text-[10px] text-[#474747] mt-1 leading-tight">{q.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Margins */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-[#151515] flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#313033]" />
            Page Margins
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { id: 'none' as MarginOption, label: 'Zero (0mm)', sub: 'Edge-to-edge' },
              { id: 'compact' as MarginOption, label: 'Compact (5mm)', sub: 'Clean frame' },
              { id: 'standard' as MarginOption, label: 'Standard (12mm)', sub: 'Print safety' },
            ].map((m) => {
              const active = settings.margin === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => updateSetting('margin', m.id)}
                  className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    active
                      ? 'border-[#0B57D0] bg-[#daf200]/60 text-[#151515] shadow-xs'
                      : 'border-[#b8b8b8] bg-[#f4f4f1] hover:bg-[#dedede] text-[#151515]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs font-bold ${active ? 'text-[#313033]' : 'text-[#151515]'}`}>
                      {m.label}
                    </span>
                    {active && <Check className="w-3.5 h-3.5 text-[#313033]" />}
                  </div>
                  <span className="text-[10px] text-[#474747] mt-0.5">{m.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filename & Stamp */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-[#151515] flex items-center gap-1.5 mb-1.5">
              <FileCode className="w-3.5 h-3.5 text-[#313033]" />
              Document Filename
            </label>
            <div className="relative">
              <input
                type="text"
                value={settings.fileName}
                onChange={(e) => updateSetting('fileName', e.target.value)}
                placeholder="freepdfconverter-document"
                className="editorial-input text-xs pr-12 font-medium rounded-xl border-[#aaa] focus:border-[#0B57D0]"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#666666]">
                .pdf
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-1">
            {settings.layoutMode !== 'continuous' && (
              <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-[#151515] font-medium">
                <input
                  type="checkbox"
                  checked={settings.showPageNumbers}
                  onChange={(e) => updateSetting('showPageNumbers', e.target.checked)}
                  className="rounded border-[#747775] text-[#313033] focus:ring-[#0B57D0]/20 w-4 h-4"
                />
                <Hash className="w-3.5 h-3.5 text-[#474747]" />
                <span>Add Page Numbers</span>
              </label>
            )}

            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-[#151515] font-medium">
              <input
                type="checkbox"
                checked={settings.addTimestamp}
                onChange={(e) => updateSetting('addTimestamp', e.target.checked)}
                className="rounded border-[#747775] text-[#313033] focus:ring-[#0B57D0]/20 w-4 h-4"
              />
              <Clock className="w-3.5 h-3.5 text-[#474747]" />
              <span>Timestamp Footer</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

