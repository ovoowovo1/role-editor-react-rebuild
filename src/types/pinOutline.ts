export type PinOutlineSegmentType = 'line' | 'quadratic' | 'formula';

export interface PinOutlinePoint {
  id: string;
  x: number;
  y: number;
}

export interface PinOutlineSegment {
  type: PinOutlineSegmentType;
  curvature: number;
  formula: string;
}

export interface PinOutlineMaterial {
  id: string;
  assetId: string;
}

export interface PinOutlineState {
  active: boolean;
  pins: PinOutlinePoint[];
  segments: PinOutlineSegment[];
  materials: PinOutlineMaterial[];
  selectedMaterialId: string | null;
}

export const DEFAULT_PIN_OUTLINE_SEGMENT: PinOutlineSegment = {
  type: 'line',
  curvature: 0.25,
  formula: '1'
};

export const DEFAULT_PIN_OUTLINE_STATE: PinOutlineState = {
  active: false,
  pins: [],
  segments: [],
  materials: [],
  selectedMaterialId: null
};
