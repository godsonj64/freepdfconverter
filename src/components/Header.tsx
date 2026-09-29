import React from 'react';
import { ArrowUpRight, ShieldCheck, FileCheck } from 'lucide-react';
import { Logo } from './Logo';

interface HeaderProps {
  queueCount: number;
  onScrollToConverter: () => void;
}

export const Header: React.FC<HeaderProps> = ({ queueCount, onScrollToConverter }) => {
  return (
    <header className="sticky top-0 inset-x-0 bg-[var(--paper)]/95 backdrop-blur-md z-50 border-b border-[var(--line)] shadow-sm transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Text Logo */}
        <div 
          onClick={onScrollToConverter}
          className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none group min-w-0"
        >
          <Logo size={34} wordmarkClassName="text-base sm:text-xl" className="transition-transform duration-200 group-hover:scale-[1.02]" />
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--ink)] bg-[var(--accent)] px-3 py-1 rounded-full ml-1.5 border border-[var(--ink)]">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--ink)]" />
            100% In-Browser & Free
          </span>
        </div>

        {/* Navigation Links with Editorial text button styling */}
        <nav className="hidden md:flex items-center gap-2 text-sm font-bold text-[#474747]">
          <a href="#features" className="px-3.5 py-1.5 rounded-full hover:bg-[var(--soft)] hover:text-[var(--ink)] transition-colors">
            Engine Features
          </a>
          <a href="#comparison" className="px-3.5 py-1.5 rounded-full hover:bg-[var(--soft)] hover:text-[var(--ink)] transition-colors">
            Continuous Canvas
          </a>
          <a href="#use-cases" className="px-3.5 py-1.5 rounded-full hover:bg-[var(--soft)] hover:text-[var(--ink)] transition-colors">
            Use Cases
          </a>
          <a href="#faq" className="px-3.5 py-1.5 rounded-full hover:bg-[var(--soft)] hover:text-[var(--ink)] transition-colors">
            FAQ
          </a>
        </nav>

        {/* Right CTA Area */}
        <div className="flex items-center gap-3">
          {queueCount > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-[var(--ink)] bg-[var(--accent)] border border-[var(--ink)] px-3.5 py-1.5 rounded-full">
              <FileCheck className="w-3.5 h-3.5 text-[var(--ink)]" />
              <span>{queueCount} in queue</span>
            </div>
          )}
          <button 
            type="button"
            onClick={onScrollToConverter}
            className="editorial-btn editorial-btn-dark text-xs sm:text-sm py-2 px-5"
          >
            <span className="sm:hidden">Start</span>
            <span className="hidden sm:inline">Launch Studio</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

