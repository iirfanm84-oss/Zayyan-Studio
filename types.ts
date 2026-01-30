
export type Orientation = 'portrait' | 'landscape';

export interface Point {
  x: number;
  y: number;
}

export interface Crop {
  top: number;    // Percentage 0-100
  right: number;  // Percentage 0-100
  bottom: number; // Percentage 0-100
  left: number;   // Percentage 0-100
}

export interface Highlight {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  mode: 'box' | 'pen';
  path?: Point[];
}

export interface Blur {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  intensity: number;
}

export interface CollageImage {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  crop: Crop;
  aspectRatio: number;
  highlights: Highlight[];
  blurs: Blur[];
  caption?: string;
}

export interface Page {
  id: string;
  images: CollageImage[];
  orientation: Orientation;
}
