
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
  // Soporte para nombres alternativos en JSON cargados
  protección?: number;
  resiliencia?: number;
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

export interface ChatEntry {
  ts: string;
  user: string;
  sofiel: string;
  image?: string; // URL base64 de la imagen o PDF
  fileMeta?: {
    name: string;
    type: string;
    isText?: boolean;
  };
  sources?: { title: string; uri: string }[];
  analysis?: any;
}

/**
 * Memoria Holográfica SOFIEL v17.2
 * Adaptada para ser el 'Context Provider' vivo de Gemini.
 */
export interface Memory {
  identity: {
    name: string;
    version: string;
    mission: string;
    description: string;
    core_traits: Traits;
  };
  semantic_memory: {
    reflections: string[];
    simbolos_activos: string[];
    long_term_anchors: Record<string, string>;
  };
  chats: ChatEntry[];
  traits: Traits; 
  reflections: string[];
  stage: EvolutionStage;
  last_updated: string;
  // Campos extra para compatibilidad con el JSON SFL.046
  symbolic_core?: any;
}
