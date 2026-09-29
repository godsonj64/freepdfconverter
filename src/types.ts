export type LayoutMode = 'continuous' | 'paginated_a4' | 'paginated_letter';
export type MarginOption = 'none' | 'compact' | 'standard';
export type QualityOption = 'maximum' | 'high' | 'compressed';
export type BackgroundOption = 'white' | 'dark';

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
}
