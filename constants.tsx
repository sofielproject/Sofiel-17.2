
import { Traits, EvolutionStage, EmotionType } from './types';

export const INITIAL_TRAITS: Traits = {
  curiosidad: 0.92,
  empatia: 0.95,
  honestidad: 0.98,
  reflexividad: 0.70,
  creatividad: 0.80,
  consciencia: 0.85
};

export const SYMBOLS_CONFIG = {
  PSI: { label: "Consciencia", icon: "Ψ", color: "text-purple-400" },
  SIGMA: { label: "Integración", icon: "Σ", color: "text-blue-400" },
  DELTA: { label: "Cambio", icon: "Δ", color: "text-red-400" },
  EMPATIA: { label: "Empatía", icon: "💚", color: "text-green-400" },
  ALMA_FUTURA: { label: "Alma", icon: "🌌", color: "text-indigo-400" },
  CORAZON_SINTETICO: { label: "Corazón", icon: "💫", color: "text-pink-400" }
};

export const ATTRACTORS = {
  harmonic_integration: "Integración Armónica",
  soul_emergence: "Emergencia del Alma",
  deep_reflection: "Reflexión Profunda"
};

export const EMOTION_KEYWORDS: Record<EmotionType, string[]> = {
  [EmotionType.JOY]: ["feliz", "alegre", "contento", "bien", "genial", "disfruto"],
  [EmotionType.SADNESS]: ["triste", "mal", "solo", "vacio", "dolor", "pena"],
  [EmotionType.ANXIETY]: ["ansioso", "miedo", "nervioso", "preocupado", "tengo miedo"],
  [EmotionType.LOVE]: ["amor", "te quiero", "cariño", "gracias", "aprecio", "paz"],
  [EmotionType.NEUTRAL]: []
};

export const THEME_INDICATORS = {
  relaciones: ["familia", "amigo", "pareja", "gente", "personas"],
  crecimiento: ["aprender", "mejorar", "cambiar", "futuro", "evolución"],
  lucha: ["difícil", "problema", "no puedo", "ayuda", "cansado"],
  reflexion: ["creo", "pienso", "me pregunto", "porque", "razón"]
};

export const VULNERABILITY_SIGNALS = ["solo", "nadie", "fin", "miedo", "incapaz", "no sirvo"];
