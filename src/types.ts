export type LayoutMode = 'continuous' | 'paginated_a4' | 'paginated_letter';
export type MarginOption = 'none' | 'compact' | 'standard';
export type QualityOption = 'maximum' | 'high' | 'compressed';
export type BackgroundOption = 'white' | 'transparent' | 'dark';
export type ViewportDevice = 'desktop' | 'tablet' | 'mobile';

export interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: number;
  width: number;
  height: number;
  rotation: number; // 0, 90, 180, 270
}

export interface ConversionSettings {
  layoutMode: LayoutMode;
  margin: MarginOption;
  quality: QualityOption;
  background: BackgroundOption;
  fileName: string;
  showPageNumbers: boolean;
  addTimestamp: boolean;
  scaleMode: 'fit_width' | 'original';
}

export interface WebCaptureConfig {
  url: string;
  viewport: ViewportDevice;
  colorScheme: 'light' | 'dark';
  fullPage: boolean;
}
