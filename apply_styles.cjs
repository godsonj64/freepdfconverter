const fs = require('fs');

// 1. Update index.html
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(
  '<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">',
  '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">'
);
html = html.replace('<body>', '<body class="page-bloom antialiased">');
fs.writeFileSync('index.html', html);

// 2. Update index.css
const cssContent = `@import "tailwindcss";

:root {
  --ink: #0e0e11;
  --ink-2: #3a3a42;
  --ink-soft: #6e6e78;
  --ink-faint: #9b9ba4;

  --surface: #ffffff;
  --surface-2: #f4f4f5;
  --surface-3: #ececee;

  --line: rgba(14, 14, 17, 0.09);
  --line-strong: rgba(14, 14, 17, 0.16);

  --accent-peach: #ff9d5c;
  --accent-coral: #ff6b6b;
  --accent-pink: #ff4fa3;
  --accent-magenta: #e252d8;
  --accent-violet: #8b5cf6;
  --accent-blue: #5b8def;

  --radius-card: 22px;
  --radius-pill: 999px;

  --shadow-sm: 0 1px 2px rgba(14, 14, 17, 0.05);
  --shadow-md: 0 6px 24px -8px rgba(14, 14, 17, 0.14);
  --shadow-lg: 0 24px 60px -24px rgba(14, 14, 17, 0.24);
  
  --font-inter: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
}

@theme inline {
  --color-ink: var(--ink);
  --color-ink-2: var(--ink-2);
  --color-ink-soft: var(--ink-soft);
  --color-ink-faint: var(--ink-faint);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-surface-3: var(--surface-3);
  --color-line: var(--line);
  --color-peach: var(--accent-peach);
  --color-coral: var(--accent-coral);
  --color-pink: var(--accent-pink);
  --color-magenta: var(--accent-magenta);
  --color-violet: var(--accent-violet);
  --color-blue: var(--accent-blue);
  --font-sans: var(--font-inter);
}

* {
  border-color: var(--line);
}

html {
  scroll-behavior: smooth;
  -webkit-text-size-adjust: 100%;
}

body {
  background: var(--surface);
  color: var(--ink);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.page-bloom::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    radial-gradient(38rem 30rem at -8% 2%, rgba(255, 157, 92, 0.13), transparent 60%),
    radial-gradient(34rem 28rem at 106% 0%, rgba(226, 82, 216, 0.11), transparent 58%),
    radial-gradient(40rem 32rem at 2% 100%, rgba(255, 79, 163, 0.12), transparent 60%),
    radial-gradient(36rem 30rem at 100% 98%, rgba(139, 92, 246, 0.11), transparent 60%);
}

.display {
  letter-spacing: -0.035em;
  line-height: 1.02;
  font-weight: 600;
}

.text-gradient {
  background: linear-gradient(96deg, var(--accent-peach) 2%, var(--accent-coral) 34%, var(--accent-pink) 66%, var(--accent-magenta) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
}

.panel {
  background: var(--surface-2);
  border-radius: 26px;
}

.ring-gradient {
  position: relative;
  border-radius: 20px;
  background: linear-gradient(120deg, var(--accent-violet), var(--accent-pink) 42%, var(--accent-peach) 78%, var(--accent-coral));
  padding: 1.5px;
}

.ring-gradient > * {
  border-radius: 18.5px;
  background: var(--surface);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: var(--radius-pill);
  font-size: 0.8125rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  padding: 0.625rem 1.125rem;
  transition: transform 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease, opacity 0.16s ease;
  white-space: nowrap;
}

.btn:active {
  transform: translateY(1px);
}

.btn-dark {
  background: var(--ink);
  color: #fff;
  box-shadow: var(--shadow-sm);
}

.btn-dark:hover {
  background: #26262e;
}

.btn-light {
  background: var(--surface);
  color: var(--ink);
  border: 1px solid var(--line-strong);
}

.btn-light:hover {
  background: var(--surface-2);
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  padding: 0.3125rem 0.6875rem;
  font-size: 0.75rem;
  color: var(--ink-soft);
  background: var(--surface);
  transition: border-color 0.16s ease, color 0.16s ease, background-color 0.16s ease;
}

.chip[data-active="true"] {
  border-color: var(--line-strong);
  color: var(--ink);
  background: var(--surface-2);
}

.field {
  width: 100%;
  border: 1px solid var(--line-strong);
  border-radius: 12px;
  background: var(--surface);
  padding: 0.6875rem 0.875rem;
  font-size: 0.875rem;
  color: var(--ink);
  outline: none;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.field:focus {
  border-color: rgba(255, 79, 163, 0.55);
  box-shadow: 0 0 0 3px rgba(255, 79, 163, 0.12);
}

.field::placeholder {
  color: var(--ink-faint);
}

@keyframes rise {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: none; }
}

.rise {
  animation: rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}

::selection {
  background: rgba(255, 79, 163, 0.2);
}
`;
fs.writeFileSync('src/index.css', cssContent);

// 3. Update App.tsx return block
let appTsx = fs.readFileSync('src/App.tsx', 'utf8');

const newReturnBlock = `  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 bg-surface/80 backdrop-blur-md z-50 border-b border-line">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg tracking-tight text-ink">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-peach to-pink flex items-center justify-center text-white">
              <ImageIcon className="w-3 h-3" />
            </div>
            ContinuPDF
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-soft">
            <a href="#" className="hover:text-ink transition-colors">Product</a>
            <a href="#" className="hover:text-ink transition-colors">Use Cases</a>
            <a href="#" className="hover:text-ink transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-sm font-medium text-ink-soft hover:text-ink transition-colors">Login</button>
            <button className="btn btn-dark">
              Start Converting
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="flex justify-center">
            <div className="chip">
              <span className="font-semibold text-ink">1M+ Conversions</span>
              <span className="text-ink-faint">|</span>
              <span>100K+ Users</span>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-7xl display tracking-tight text-ink">
            The Future of Seamless <br />
            <span className="text-gradient">
              PDF Creation.
            </span>
          </h1>
          
          <p className="text-lg text-ink-soft max-w-2xl mx-auto leading-relaxed">
            Generate continuous PDFs from your scrolling screenshots and PNGs. Transform multiple images into one perfectly stitched document that reads genuinely naturally — perfect for receipts, articles, and chats.
          </p>

          <div className="flex items-center justify-center gap-4 pt-4">
            <button 
              onClick={() => document.getElementById('converter')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn btn-dark px-6 py-3"
            >
              Try ContinuPDF
              <ArrowRight className="w-4 h-4" />
            </button>
            <button className="btn btn-light px-6 py-3">
              View Examples
            </button>
          </div>
        </div>

        {/* Converter Applet */}
        <div id="converter" className="max-w-4xl mx-auto mt-24">
          <div className="ring-gradient rise shadow-2xl shadow-pink/10">
            <div className="overflow-hidden flex flex-col min-h-[400px]">
              {/* Header Gradient */}
              <div className="h-32 bg-gradient-to-r from-peach via-pink to-violet p-6 flex flex-col justify-between">
                <div className="flex justify-between items-center text-white">
                  <div className="flex items-center gap-2 font-medium bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-sm shadow-sm border border-white/20">
                    <ImageIcon className="w-4 h-4" />
                    <span>PNG to PDF</span>
                  </div>
                  <div className="flex bg-white/20 backdrop-blur-md p-1 rounded-full shadow-sm border border-white/20 gap-1">
                    <button 
                      onClick={() => setActiveTab('upload')}
                      className={\`px-4 py-1.5 rounded-full text-sm font-medium transition-colors \${activeTab === 'upload' ? 'bg-white text-pink shadow-sm' : 'text-white hover:bg-white/10'}\`}
                    >
                      Upload Files
                    </button>
                    <button 
                      onClick={() => setActiveTab('url')}
                      className={\`px-4 py-1.5 rounded-full text-sm font-medium transition-colors \${activeTab === 'url' ? 'bg-white text-pink shadow-sm' : 'text-white hover:bg-white/10'}\`}
                    >
                      Website URL
                    </button>
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 p-8 -mt-10">
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={\`relative bg-surface rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-12 text-center min-h-[280px] shadow-sm \${
                    isDragging 
                      ? 'border-pink bg-pink/5 scale-[1.02]' 
                      : 'border-line hover:border-pink/30 hover:bg-surface-2'
                  }\`}
                >
                  <input 
                    type="file"
                    multiple
                    accept="image/png, image/jpeg, image/webp, image/gif"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  
                  {activeTab === 'url' ? (
                    <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto">
                      <div className="w-16 h-16 rounded-full bg-peach/10 text-peach flex items-center justify-center mb-2">
                        <Globe className="w-8 h-8" />
                      </div>
                      <div className="w-full text-center">
                        <h3 className="text-xl font-semibold text-ink">Capture a Website</h3>
                        <p className="text-ink-soft mt-2 text-sm mb-6">
                          Enter any public URL. We'll capture a full-page scrolling screenshot and add it to your pipeline.
                        </p>
                        <div className="flex items-center gap-2 w-full">
                          <div className="relative flex-1">
                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
                            <input 
                              type="url"
                              placeholder="https://example.com"
                              value={urlInput}
                              onChange={(e) => setUrlInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleCaptureUrl()}
                              className="field pl-9 w-full"
                            />
                          </div>
                          <button 
                            onClick={handleCaptureUrl}
                            disabled={isCapturing || !urlInput}
                            className="btn btn-dark h-full whitespace-nowrap"
                          >
                            {isCapturing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Capture'}
                          </button>
                        </div>
                      </div>
                      {files.length > 0 && (
                        <button onClick={() => setActiveTab('upload')} className="mt-4 text-sm font-medium text-pink hover:text-pink/80">
                          View {files.length} ready file{files.length !== 1 ? 's' : ''} &rarr;
                        </button>
                      )}
                    </div>
                  ) : files.length === 0 ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-pink/10 text-pink flex items-center justify-center mb-2">
                        <Upload className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-ink">Drop your PNGs here</h3>
                        <p className="text-ink-soft mt-2 max-w-sm">
                          Select multiple images in order. We'll stitch them together into one seamless, continuous PDF document.
                        </p>
                      </div>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-4 btn btn-dark"
                      >
                        Browse Files
                      </button>
                    </div>
                  ) : (
                    <div className="w-full flex flex-col h-full">
                      <div className="flex justify-between items-end mb-6">
                        <h3 className="text-lg font-semibold text-ink">
                          {files.length} Image{files.length !== 1 ? 's' : ''} Ready
                        </h3>
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="text-sm font-medium text-pink hover:text-pink/80"
                        >
                          + Add more
                        </button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto max-h-[300px] pr-2 space-y-3">
                        <AnimatePresence>
                          {files.map((file, index) => (
                            <motion.div 
                              layout
                              key={\`\${file.name}-\${index}\`}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="card flex items-center justify-between p-3 group hover:border-pink/30 hover:shadow-md transition-all"
                            >
                              <div className="flex items-center gap-4 overflow-hidden">
                                <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); moveFileUp(index); }}
                                    disabled={index === 0}
                                    className="p-0.5 text-ink-faint hover:text-ink disabled:opacity-30 transition-colors"
                                  >
                                    <ChevronUp className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); moveFileDown(index); }}
                                    disabled={index === files.length - 1}
                                    className="p-0.5 text-ink-faint hover:text-ink disabled:opacity-30 transition-colors"
                                  >
                                    <ChevronDown className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="w-12 h-12 rounded-lg bg-surface-2 overflow-hidden flex-shrink-0 border border-line shadow-inner">
                                  <img 
                                    src={URL.createObjectURL(file)} 
                                    alt="preview" 
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-semibold text-ink truncate max-w-[200px]">
                                    {file.name}
                                  </span>
                                  <span className="text-xs text-ink-soft">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity delay-75" />
                                <button 
                                  onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                                  className="p-2 text-ink-faint hover:text-coral hover:bg-coral/5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>

                      <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-line">
                        <button 
                          onClick={() => setFiles([])}
                          className="btn btn-light"
                        >
                          Clear All
                        </button>
                        <button 
                          onClick={generatePDF}
                          disabled={isConverting}
                          className="btn text-white bg-gradient-to-r from-peach to-pink hover:opacity-90 shadow-lg shadow-pink/25"
                        >
                          {isConverting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <FileDown className="w-4 h-4" />
                              Convert to PDF
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="max-w-5xl mx-auto mt-40">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl display tracking-tight mb-4 text-ink">
              Built to Capture Every <br /> Detail and Nuance
            </h2>
            <p className="text-ink-soft max-w-lg mx-auto">
              Give every screenshot the right flow, alignment, and formatting to match your message.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="card p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-40 rounded-[18px] bg-peach/10 mb-6 flex items-center justify-center overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-tr from-peach to-pink opacity-0 group-hover:opacity-10 transition-opacity duration-500 mix-blend-overlay" />
                <div className="w-16 h-16 rounded-full bg-white/80 backdrop-blur shadow-sm flex items-center justify-center">
                   <div className="w-8 h-8 rounded-full bg-peach flex items-center justify-center text-white">
                      <Play className="w-4 h-4 ml-0.5" />
                   </div>
                </div>
              </div>
              <h3 className="font-bold text-lg mb-2 text-ink">Flawless Stitching</h3>
              <p className="text-ink-soft text-sm leading-relaxed">
                Automatically matches the widths and concatenates your images perfectly without arbitrary page breaks cutting off your content.
              </p>
            </div>

            <div className="card p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="h-40 rounded-[18px] bg-violet/10 mb-6 flex items-center justify-center overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-tr from-violet to-blue opacity-0 group-hover:opacity-10 transition-opacity duration-500 mix-blend-overlay" />
                <div className="w-16 h-16 rounded-full bg-white/80 backdrop-blur shadow-sm flex items-center justify-center">
                   <div className="w-8 h-8 rounded-full bg-violet flex items-center justify-center text-white">
                      <Play className="w-4 h-4 ml-0.5" />
                   </div>
                </div>
              </div>
              <h3 className="font-bold text-lg mb-2 text-ink">High Resolution</h3>
              <p className="text-ink-soft text-sm leading-relaxed">
                Preserves the crisp quality of your original screenshots, ensuring text remains sharp and legible in the final PDF.
              </p>
            </div>

            <div className="card p-6 shadow-sm hover:shadow-md transition-shadow md:col-span-2 lg:col-span-1">
              <div className="h-40 rounded-[18px] bg-emerald-500/10 mb-6 flex items-center justify-center overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400 to-teal-500 opacity-0 group-hover:opacity-10 transition-opacity duration-500 mix-blend-overlay" />
                <div className="w-16 h-16 rounded-full bg-white/80 backdrop-blur shadow-sm flex items-center justify-center">
                   <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                      <Play className="w-4 h-4 ml-0.5" />
                   </div>
                </div>
              </div>
              <h3 className="font-bold text-lg mb-2 text-ink">Lightning Fast</h3>
              <p className="text-ink-soft text-sm leading-relaxed">
                All processing happens entirely in your browser. No server uploads means absolute privacy and instantaneous generation.
              </p>
            </div>
          </div>
        </div>
        
        {/* Use Cases Section */}
        <div className="max-w-5xl mx-auto mt-40">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl display tracking-tight mb-4 text-ink">
              Perfect for Any Scenario
            </h2>
            <p className="text-ink-soft max-w-lg mx-auto">
              Whether archiving important threads or compiling inspiration, ContinuPDF adapts to your workflow.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="panel p-8 flex flex-col items-center text-center group hover:bg-peach/5 transition-colors">
              <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-peach mb-6 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg mb-3 text-ink">Chat Histories</h3>
              <p className="text-ink-soft text-sm leading-relaxed">
                Stitch together dozens of chat screenshots into a single, seamless readable document without awkward cuts in the middle of messages.
              </p>
            </div>
            <div className="panel p-8 flex flex-col items-center text-center group hover:bg-pink/5 transition-colors">
              <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-pink mb-6 group-hover:scale-110 transition-transform">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg mb-3 text-ink">Long Articles</h3>
              <p className="text-ink-soft text-sm leading-relaxed">
                Capture long-form articles, financial reports, or receipts perfectly. The continuous scroll makes reading natural and uninterrupted.
              </p>
            </div>
            <div className="panel p-8 flex flex-col items-center text-center group hover:bg-violet/5 transition-colors">
              <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-violet mb-6 group-hover:scale-110 transition-transform">
                <ImagePlus className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-lg mb-3 text-ink">Design Portfolios</h3>
              <p className="text-ink-soft text-sm leading-relaxed">
                Compile landing page designs and full-page mockups into client-ready PDFs without relying on heavy design software.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-32 border-t border-line pt-12 pb-8 flex flex-col items-center gap-6">
           <div className="flex items-center gap-2 font-bold text-lg tracking-tight text-ink">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-peach to-pink flex items-center justify-center text-white">
              <ImageIcon className="w-3 h-3" />
            </div>
            ContinuPDF
          </div>
          <p className="text-sm text-ink-faint">© 2026 ContinuPDF. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
}
`;

const returnIndex = appTsx.indexOf('  return (');
if (returnIndex !== -1) {
  appTsx = appTsx.substring(0, returnIndex) + newReturnBlock;
  fs.writeFileSync('src/App.tsx', appTsx);
} else {
  console.error("Could not find return block");
}

console.log("Applied styles successfully");
