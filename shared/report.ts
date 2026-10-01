// Single source of truth for the report shape.
// Edit this file, then run `npm run sync-types` from the repo root.

export type Severity = 'high' | 'medium' | 'low' | 'healthy';
export type Rating = 'good' | 'needs-improvement' | 'poor';
export type Level = 'low' | 'medium' | 'high';
export type VitalKey = 'lcp' | 'fcp' | 'cls' | 'tbt' | 'ttfb';

export interface Vital {
  key: VitalKey;
  label: string;
  value: number; // milliseconds, or unitless for CLS
  unit: 'ms' | '';
  display: string;
  rating: Rating;
  score: number | null; // Lighthouse metric score, 0..1
  note?: string; // e.g. "Lab proxy for INP"
  explain: {
    meaning: string;
    assessment: string;
    why: string;
    contributors: string[];
  };
}

export interface SubScore {
  key: string;
  label: string;
  value: number; // 0..100
  custom: boolean; // true = our own formula, false = derived from Lighthouse metric scores
  formula: string;
}

export interface Profile {
  bytes: {
    total: number;
    html: number;
    css: number;
    js: number;
    images: number;
    fonts: number;
    media: number;
    other: number;
    thirdParty: number;
  };
  requests: { total: number; firstParty: number; thirdParty: number };
  dom: number;
  counts: { images: number; jsFiles: number; cssFiles: number; fonts: number; iframes: number };
  thirdPartyHosts: string[];
}

export interface Distribution {
  bytes: { type: string; label: string; bytes: number; percent: number }[];
  requests: { firstParty: number; thirdParty: number };
}

export interface ScriptBlame {
  url: string;
  host: string;
  transferSize: number;
  cpuMs: number;
  thirdParty: boolean;
}
export interface ImageBlame {
  url: string;
  transferSize: number;
  potentialSavings: number;
}
export interface ThirdPartyBlame {
  name: string;
  hosts: string[];
  requests: number;
  transferSize: number;
  blockingMs: number;
}
export interface LcpElement {
  selector: string;
  label: string;
  snippet: string;
}
export interface Blame {
  scripts: ScriptBlame[];
  images: ImageBlame[];
  thirdParties: ThirdPartyBlame[];
  lcpElement: LcpElement | null;
  largeImageCount: number;
  clsCulprits: string[];
}

export interface Opportunities {
  unusedJsBytes: number;
  unusedCssBytes: number;
  renderBlockingMs: number;
  compressionOk: boolean;
  compressionSavingsBytes: number;
  cachingOk: boolean;
  cachingSavingsBytes: number;
  imageSavingsBytes: number;
}

export interface Diagnosis {
  id: string;
  title: string;
  severity: Severity;
  value: string;
  threshold: string;
  text: string;
}

export interface Recommendation {
  id: string;
  title: string;
  impact: Level;
  effort: Level;
  detected: string;
  action: string;
  potential: string | null;
  savingsMs: number;
  savingsBytes: number;
  priority: number;
}

export interface ActionItem {
  rank: number;
  id: string;
  title: string;
  impact: Level;
  effort: Level;
}

export interface Metrics {
  performance: number;
  lcp: number;
  fcp: number;
  tbt: number;
  cls: number;
  pageBytes: number;
  requests: number;
}

export type ScenarioId = 'no-third-party' | 'no-top-third-party' | 'no-top-script';

export interface SimulationPlanItem {
  id: ScenarioId;
  label: string;
  description: string;
  patterns: string[];
  blockedCount: number;
}

export interface Estimate {
  id: string;
  label: string;
  method: 'estimated';
  beforeBytes: number;
  afterBytes: number;
  note: string;
}

export interface SimulationResult {
  scenario: ScenarioId;
  label: string;
  method: 'measured';
  before: Metrics;
  after: Metrics;
  blockedPatterns: string[];
  caveat: string;
}

export interface Health {
  categories: { label: string; value: number }[];
  statuses: { label: string; rating: Rating }[];
}

export interface Report {
  schemaVersion: 1;
  meta: {
    url: string;
    finalUrl: string;
    device: 'mobile';
    engine: 'local';
    runs: number;
    runScores: number[];
    analyzedAt: string;
    lighthouseVersion: string;
    throttling: string;
    screenshot: string | null;
  };
  scores: { performance: number; accessibility: number; seo: number; bestPractices: number };
  status: { label: string; rating: Rating };
  overview: SubScore[];
  vitals: Vital[];
  profile: Profile;
  distribution: Distribution;
  blame: Blame;
  opportunities: Opportunities;
  diagnosis: Diagnosis[];
  bottlenecks: { high: string[]; medium: string[]; low: string[]; healthy: string[] };
  recommendations: Recommendation[];
  actionPlan: ActionItem[];
  rankingFormula: string;
  baseline: Metrics;
  simulationPlan: SimulationPlanItem[];
  estimates: Estimate[];
  health: Health;
  summary: { executive: string; engineering: string; source: 'llm' | 'template' };
}

// Row shapes from Supabase
export interface AnalysisRow {
  id: string;
  url: string;
  status: 'queued' | 'running' | 'done' | 'error';
  stage: string | null;
  report: Report | null;
  error: string | null;
  created_at: string;
}

export interface SimulationRow {
  id: string;
  analysis_id: string;
  scenario: ScenarioId;
  status: 'queued' | 'running' | 'done' | 'error';
  result: SimulationResult | null;
  error: string | null;
  created_at: string;
}
