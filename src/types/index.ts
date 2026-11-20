export const OST_TOPICS = [
  'THE LAZY WAY STRATEGIES',
  'DATA ANALYSIS (BOX WHISKER, LINE OF BEST FIT, DATA, ETC...)',
  'ALL THINGS POLYNOMIALS',
  'FUNCTIONS AND FUNCTION NOTATIONS',
  'FACTORING, SOLVING, MODELING, ANALYZING QUADRATICS',
  'CREATE, ANALYZE, MODEL EXPONENTIAL FUNCTIONS',
  'CREATING, GRAPHING, MODELING LINEAR (PART 1)',
  'CREATING, GRAPHING, MODELING LINEAR (PART 2)',
  'CREATING, SOLVING, MODELING SYSTEMS OF EQUATIONS',
  'EXPRESSIONS, EQUATIONS, AND INEQUALITIES',
] as const;

export type OstTopic = (typeof OST_TOPICS)[number];

export type QuestionKind = 'single' | 'multi' | 'numeric';

export interface TableVisual {
  type: 'table';
  title?: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface StepsVisual {
  type: 'steps';
  title?: string;
  steps: { label: string; expression: string }[];
}

export interface BoxPlotSpec {
  label: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  color?: string;
}

export interface BoxPlotVisual {
  type: 'boxplots';
  title?: string;
  axisLabel?: string;
  domain: [number, number];
  step: number;
  plots: BoxPlotSpec[];
}

export interface DotPlotSpec {
  label: string;
  values: Record<number, number>;
}

export interface DotPlotVisual {
  type: 'dotplots';
  title?: string;
  axisLabel?: string;
  domain: [number, number];
  step: number;
  plots: DotPlotSpec[];
}

export interface HistogramVisual {
  type: 'histogram';
  title: string;
  xLabel: string;
  yLabel: string;
  bins: { label: string; count: number }[];
  maxY: number;
}

export interface CoordinateGraphVisual {
  type: 'graph';
  title?: string;
  xRange: [number, number];
  yRange: [number, number];
  xStep?: number;
  yStep?: number;
  xLabel?: string;
  yLabel?: string;
  points?: { x: number; y: number }[];
  lines?: {
    slope?: number;
    intercept?: number;
    points?: { x: number; y: number }[];
    dashed?: boolean;
    color?: string;
    label?: string;
  }[];
  curves?: {
    fn: 'quadratic' | 'exponential';
    a: number;
    b: number;
    c?: number;
    color?: string;
  }[];
  inequalities?: {
    slope: number;
    intercept: number;
    op: '<=' | '>=' | '<' | '>';
  }[];
  verticalInequality?: {
    x: number;
    op: '<=' | '>=' | '<' | '>';
  };
}

export type ProblemVisual =
  | TableVisual
  | StepsVisual
  | BoxPlotVisual
  | DotPlotVisual
  | HistogramVisual
  | CoordinateGraphVisual;

export interface MathProblem {
  id: string;
  topic: OstTopic;
  kind: QuestionKind;
  prompt: string;
  options?: string[];
  correctIndices?: number[];
  acceptedAnswers?: string[];
  answerPrefix?: string;
  answerSuffix?: string;
  playbookTip: string;
  explanation: string;
  visual?: ProblemVisual;
}

export type MakeupGroup = 'Face' | 'Cheeks' | 'Brows & Eyes' | 'Lips';

export type MakeupZoneId =
  | 'foundation'
  | 'concealer'
  | 'contour'
  | 'blush'
  | 'highlighter'
  | 'eyebrows'
  | 'eyeshadow_lid'
  | 'eyeshadow_crease'
  | 'eyeliner'
  | 'mascara'
  | 'lipliner'
  | 'lipstick'
  | 'lipgloss';

export type MakeupFinish = 'Matte' | 'Satin' | 'Cream' | 'Shimmer' | 'Metallic' | 'Gloss';

export interface MakeupShade {
  id: string;
  name: string;
  hex: string;
  secondaryHex?: string;
  finish: MakeupFinish;
  bestFor: string;
  starterUnlocked?: boolean;
  cost: number;
}

export interface MakeupProduct {
  zone: MakeupZoneId;
  group: MakeupGroup;
  name: string;
  shortName: string;
  whatItIs: string;
  whereItGoes: string;
  proTip: string;
  defaultOpacity: number;
  supportsStyle?: boolean;
  shades: MakeupShade[];
}

export type BrushSize = 'fine' | 'medium' | 'fluffy';
export type MakeupToolMode = 'apply' | 'wipe';
export type MakeupStyle = 'natural' | 'classic' | 'glam';

export type UnlockableToolId =
  | 'brush_fine'
  | 'brush_fluffy'
  | 'tool_wipe'
  | 'zone_concealer'
  | 'zone_contour'
  | 'zone_highlighter'
  | 'zone_eyeshadow_crease'
  | 'zone_eyeliner'
  | 'zone_mascara'
  | 'zone_lipliner'
  | 'zone_lipgloss'
  | 'style_classic'
  | 'style_glam';

export interface UnlockableToolInfo {
  id: UnlockableToolId;
  label: string;
  category: 'Brush & Wipe' | 'Makeup Zone' | 'Pro Style';
  description: string;
  cost: number;
}

export interface AppliedLayer {
  shadeId: string;
  hex: string;
  secondaryHex?: string;
  finish: MakeupFinish;
  opacity: number;
  coverage: number;
  style?: MakeupStyle;
}

export type AppliedMakeupState = Partial<Record<MakeupZoneId, AppliedLayer>>;

export interface SkinPalette {
  base: string;
  midtone: string;
  highlight: string;
  shadow: string;
  deepShadow: string;
  undertone: string;
  naturalLipUpper: string;
  naturalLipLower: string;
  lipLine: string;
  blushNatural: string;
  sclera: string;
  irisOuter: string;
  irisInner: string;
  browDefault: string;
  lashDefault: string;
  hairBase: string;
  hairHighlight: string;
  hairShadow: string;
}

export type HairStyle = 'waves' | 'sleek' | 'curls' | 'braids' | 'afro' | 'bob' | 'updo';

export interface ModelProfile {
  id: string;
  name: string;
  skinToneLabel: string;
  undertoneLabel: string;
  hairStyle: HairStyle;
  faceShape: 'oval' | 'heart' | 'round' | 'sculpted';
  lipFullness: number;
  eyeTilt: number;
  browArch: number;
  palette: SkinPalette;
}

export interface SavedFigureRecord {
  id: string;
  ownerId: string;
  title: string;
  modelId: string;
  hairStyle?: HairStyle;
  thumbnailDataUrl: string;
  makeupState: AppliedMakeupState;
  zoneMasks: Record<string, string>;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AnswerStats {
  correct: number;
  incorrect: number;
}

export type TopicStatsMap = Record<string, AnswerStats>;
export type DailyStatsMap = Record<string, AnswerStats>;

