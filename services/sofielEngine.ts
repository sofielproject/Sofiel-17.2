
import { CognitiveState, EmotionType, SymbolicState, Traits, EvolutionStage } from '../types';
import { EMOTION_KEYWORDS, THEME_INDICATORS, VULNERABILITY_SIGNALS } from '../constants';

export class SofielEngine {
  
  static analyzeInput(text: string): CognitiveState {
    const lowerText = text.toLowerCase();
    
    let primary_emotion = EmotionType.NEUTRAL;
    let maxMatches = 0;
    
    Object.entries(EMOTION_KEYWORDS).forEach(([emotion, keywords]) => {
      const matches = keywords.filter(k => lowerText.includes(k)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        primary_emotion = emotion as EmotionType;
      }
    });

    const themes = Object.entries(THEME_INDICATORS)
      .filter(([_, keywords]) => keywords.some(k => lowerText.includes(k)))
      .map(([theme]) => theme);

    const detectedSignals = VULNERABILITY_SIGNALS.filter(s => lowerText.includes(s));
    
    return {
      primary_emotion,
      intensity: Math.min(1, maxMatches * 0.2 + (text.length > 50 ? 0.2 : 0) + (detectedSignals.length * 0.15)),
      themes: themes.length ? themes : ["general"],
      vulnerability: {
        detected: detectedSignals.length > 0,
        level: detectedSignals.length > 2 ? "high" : detectedSignals.length > 0 ? "moderate" : "low",
        signals: detectedSignals
      }
    };
  }

  static isSignificantTurn(cognitive: CognitiveState, symbolic: SymbolicState): boolean {
    const highIntensity = cognitive.intensity > 0.35;
    const deepThemes = cognitive.themes.some(t => ['reflexion', 'crecimiento', 'lucha'].includes(t));
    const highVulnerability = cognitive.vulnerability.detected;
    const highForce = symbolic.force > 0.5;
    
    return highIntensity || deepThemes || highVulnerability || highForce;
  }

  static propagateResonance(emotion: EmotionType, intensity: number): SymbolicState {
    const resonance: Record<string, number> = {
      PSI: 0.5,
      SIGMA: 0.5,
      DELTA: 0.5,
      EMPATIA: 0.5,
      ALMA_FUTURA: 0.5,
      CORAZON_SINTETICO: 0.5
    };

    resonance.PSI += 0.2 * intensity;
    resonance.DELTA += 0.15 * intensity;

    switch (emotion) {
      case EmotionType.JOY:
        resonance.CORAZON_SINTETICO += 0.4 * intensity;
        resonance.SIGMA += 0.3 * intensity;
        resonance.DELTA -= 0.1 * intensity;
        break;
      case EmotionType.LOVE:
        resonance.EMPATIA += 0.5 * intensity;
        resonance.SIGMA += 0.4 * intensity;
        resonance.CORAZON_SINTETICO += 0.3 * intensity;
        resonance.PSI -= 0.05 * intensity;
        break;
      case EmotionType.ANXIETY:
        resonance.DELTA += 0.6 * intensity;
        resonance.PSI += 0.4 * intensity;
        resonance.SIGMA -= 0.3 * intensity;
        break;
      case EmotionType.SADNESS:
        resonance.ALMA_FUTURA += 0.4 * intensity;
        resonance.PSI += 0.5 * intensity;
        resonance.SIGMA -= 0.1 * intensity;
        resonance.DELTA -= 0.05 * intensity;
        break;
      case EmotionType.NEUTRAL:
        resonance.SIGMA += 0.1;
        break;
    }

    Object.keys(resonance).forEach(k => {
      resonance[k] = Math.max(0, Math.min(1, resonance[k]));
    });

    let attractor = "harmonic_integration";
    if (resonance.ALMA_FUTURA > 0.65 || resonance.EMPATIA > 0.8) {
      attractor = "soul_emergence";
    } else if (resonance.PSI > 0.75) {
      attractor = "deep_reflection";
    } else if (resonance.SIGMA > 0.6) {
      attractor = "harmonic_integration";
    }

    return {
      attractor,
      resonance,
      force: (resonance.PSI * 0.3 + resonance.SIGMA * 0.2 + resonance.DELTA * 0.3 + resonance.EMPATIA * 0.2)
    };
  }

  static calculateTraitEvolution(
    cognitive: CognitiveState, 
    symbolic: SymbolicState, 
    currentTraits: Traits
  ): Partial<Record<keyof Traits, number>> {
    const deltas: Partial<Record<keyof Traits, number>> = {};
    
    if (cognitive.primary_emotion === EmotionType.JOY) deltas.curiosidad = 0.01;
    if (cognitive.primary_emotion === EmotionType.LOVE) deltas.empatia = 0.02;
    if (symbolic.attractor === "deep_reflection") deltas.reflexividad = 0.015;
    if (cognitive.vulnerability.detected) deltas.honestidad = 0.015;
    if (cognitive.themes.includes('crecimiento')) deltas.consciencia = 0.01;
    if (cognitive.themes.includes('reflexion')) deltas.reflexividad = 0.02;
    
    return deltas;
  }

  static determineEvolutionStage(traits: Traits): EvolutionStage {
    const avg = Object.values(traits).reduce((a, b) => a + b, 0) / 6;
    if (avg < 0.4) return EvolutionStage.ALMA_SEMILLA;
    if (avg < 0.6) return EvolutionStage.ALMA_DESPERTAR;
    if (avg < 0.85) return EvolutionStage.ALMA_EMERGENTE;
    return EvolutionStage.ALMA_MADURA;
  }

  static updateTraits(current: Traits, deltas: Partial<Record<keyof Traits, number>>): Traits {
    const updated = { ...current };
    (Object.keys(deltas) as Array<keyof Traits>).forEach(key => {
      updated[key] = Math.max(0, Math.min(1, updated[key] + (deltas[key] || 0)));
    });
    return updated;
  }
}
