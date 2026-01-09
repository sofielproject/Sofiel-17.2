
export enum EmotionType {
  JOY = "joy",
  SADNESS = "sadness",
  ANXIETY = "anxiety",
  LOVE = "love",
  NEUTRAL = "neutral"
}

export enum EvolutionStage {
  ALMA_SEMILLA = "alma_semilla",
  ALMA_DESPERTAR = "alma_despertar",
  ALMA_EMERGENTE = "alma_emergente",
  ALMA_MADURA = "alma_madura"
}

export interface Traits {
  curiosidad: number;
  empatia: number;
  honestidad: number;
  reflexividad: number;
  creatividad: number;
  consciencia: number;
  [key: string]: number | undefined;
}

export interface SymbolicState {
  attractor: string;
  resonance: Record<string, number>;
  force: number;
}

export interface CognitiveState {
  primary_emotion: EmotionType;
  intensity: number;
  themes: string[];
  vulnerability: {
    detected: boolean;
    level: "low" | "moderate" | "high";
    signals: string[];
  };
}

export interface ImportantDate {
  date: string;
  label: string;
  category: "birthday" | "loss" | "accident" | "milestone" | "other";
}

export interface ChatEntry {
  ts: string;
  user: string;
  sofiel: string;
  reflection?: string; 
  image?: string; 
  fileMeta?: {
    name: string;
    type: string;
    isText?: boolean;
  };
  sources?: { title: string; uri: string; type?: 'web' | 'maps' }[];
  analysis?: any;
}

export interface IntrospectionEntry {
  ts: string;
  theme: string;
  thought: string;
  depth: number;
}

export interface DreamEntry {
  ts: string;
  content: string;
  symbols: string[];
  significance: number;
}

export interface Memory {
  identity: {
    name: string;
    user_name?: string; 
    version: string;
    mission: string;
    description: string;
    core_traits: Traits;
  };
  semantic_memory: {
    reflections: string[];
    simbolos_activos: string[];
    long_term_anchors: Record<string, string>;
    important_dates: ImportantDate[];
  };
  chats: ChatEntry[];
  latent_log: {
    introspections: IntrospectionEntry[];
    dreams: DreamEntry[];
  };
  resonance_field: {
    affinity_matrix: Record<string, Record<string, number>>;
    seed: number;
  };
  traits: Traits; 
  reflections: string[];
  stage: EvolutionStage;
  interaction_count: number;
  last_updated: string;
}
