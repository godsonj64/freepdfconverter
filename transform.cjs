const fs = require('fs');
const files = [
  'src/App.tsx', 'src/components/Header.tsx', 'src/components/Footer.tsx',
  'src/components/QueueManager.tsx', 'src/components/SettingsPanel.tsx',
  'src/components/PreviewModal.tsx', 'src/components/FeatureShowcase.tsx',
  'src/components/FAQSection.tsx'
];
files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/bg-\[\#FDFBFF\]/g, 'bg-[#d6d6d6]');
  content = content.replace(/text-\[\#FDFBFF\]/g, 'text-[#f4f4f1]');
  content = content.replace(/bg-\[\#F8FAFD\]/g, 'bg-[#f4f4f1]');
  content = content.replace(/bg-\[\#FFFFFF\]/g, 'bg-[#f4f4f1]');
  content = content.replace(/bg-\[\#F0F4F9\]/g, 'bg-[#dedede]');
  content = content.replace(/border-\[\#E1E7F0\]/g, 'border-[#b8b8b8]');
  content = content.replace(/border-\[\#C4C7C5\]/g, 'border-[#aaa]');
  content = content.replace(/text-\[\#1F1F1F\]/g, 'text-[#151515]');
  content = content.replace(/text-\[\#444746\]/g, 'text-[#474747]');
  content = content.replace(/text-\[\#747775\]/g, 'text-[#666666]');
  content = content.replace(/text-\[\#0B57D0\]/g, 'text-[#313033]');
  content = content.replace(/bg-\[\#0B57D0\]/g, 'bg-[#313033]');
  content = content.replace(/bg-\[\#D3E3FD\]/g, 'bg-[#daf200]');
  content = content.replace(/text-\[\#041E49\]/g, 'text-[#151515]');
  content = content.replace(/bg-\[\#C2E7FF\]/g, 'bg-[#daf200]');
  content = content.replace(/text-\[\#00639B\]/g, 'text-[#151515]');
  content = content.replace(/bg-\[\#C4EED0\]/g, 'bg-[#daf200]');
  content = content.replace(/text-\[\#146C2E\]/g, 'text-[#151515]');
  content = content.replace(/bg-\[\#FFDAD6\]/g, 'bg-[#ffcdd2]');
  content = content.replace(/text-\[\#410002\]/g, 'text-[#d32f2f]');
  content = content.replace(/text-\[\#BA1A1A\]/g, 'text-[#d32f2f]');
  
  content = content.replace(/m3-btn m3-btn-filled/g, 'editorial-btn editorial-btn-dark');
  content = content.replace(/m3-btn m3-btn-outlined/g, 'editorial-btn editorial-btn-outlined');
  content = content.replace(/m3-btn m3-btn-tonal/g, 'editorial-btn editorial-btn-tonal');
  content = content.replace(/m3-btn m3-btn-text/g, 'editorial-btn');
  content = content.replace(/m3-chip/g, 'editorial-chip');
  content = content.replace(/m3-segmented-group/g, 'editorial-segmented');
  content = content.replace(/m3-segmented-item/g, 'editorial-segmented-item');
  content = content.replace(/m3-input/g, 'editorial-input');
  content = content.replace(/rounded-3xl/g, 'rounded-[1.8vw]');
  
  if (file === 'src/App.tsx') {
    content = content.replace(/const blob1 = await createSampleCanvas\('Order Summary & Invoice #4092', '#0B57D0', '#4285F4', 1000\);/g, "const blob1 = await createSampleCanvas('Order Summary & Invoice #4092', '#313033', '#474747', 1000);");
    content = content.replace(/const blob2 = await createSampleCanvas\('Customer Chat Transcript & Notes', '#0B57D0', '#146C2E', 1200\);/g, "const blob2 = await createSampleCanvas('Customer Chat Transcript & Notes', '#313033', '#daf200', 1200);");
  }
  fs.writeFileSync(file, content, 'utf8');
});
