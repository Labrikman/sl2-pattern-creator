// ==========================================
// 1. AUDIO UTILITIES (Math functions)
// ==========================================

// --- DISTORTION ULTRA PUISSANTE (NORMALISÉE) ---
const makeDistortionCurve = (amount) => {
  // Si la distorsion est à 0, on renvoie une ligne droite (bypass propre)
  if (amount <= 0) return new Float32Array([-1, 1]); 
  
  const k = amount;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;

  // On calcule le pic maximum de la formule pour normaliser le son
  const peak = ((3 + k) * 1 * 20 * deg) / (Math.PI + k * 1);

  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    const y = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    // En divisant y par peak, le son va taper exactement le mur des 100% de volume
    curve[i] = y / peak; 
  }
  return curve;
};

// --- VRAI BITCRUSHER (RÉSOLUTION D'AMPLITUDE) ---
const makeBitCrusherCurve = (bits) => {
  // Plus le nombre de bits est bas, moins il y a d'"escaliers" de volume
  const steps = Math.pow(2, bits); 
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    // On quantifie le signal sur ces escaliers
    curve[i] = Math.round(x * steps) / steps;
  }
  return curve;
};

const mapFreq = (val, min = 20, max = 12000) => {
  const norm = val / 100;
  return min * Math.pow(max / min, norm);
};

const mapGain = (val) => {
  return (val - 50) * 0.5; // -25dB → +25dB
};

const mapQ = (val) => {
  return 0.5 + (val / 100) * 9.5; // 0.5 → 10
};
// const generateReverbBuffer = (audioCtx, type) => {
//   const sampleRate = audioCtx.sampleRate;
//   const duration = type === "hall" ? 2.5 : type === "room" ? 0.7 : 1.2;
//   const decay = type === "hall" ? 2.0 : type === "room" ? 5.0 : 3.0;
//   const length = sampleRate * duration;
//   const impulse = audioCtx.createBuffer(2, length, sampleRate);
//   const left = impulse.getChannelData(0);
//   const right = impulse.getChannelData(1);
//   for (let i = 0; i < length; i++) {
//     const multiplier = Math.pow(1 - i / length, decay);
//     left[i] = (Math.random() * 2 - 1) * multiplier;
//     right[i] = (Math.random() * 2 - 1) * multiplier;
//   }
//   return impulse;
// };

// --- UI UTILITY: Dynamic effect parameter name ---
const getEffectParamName = (effectType) => {
  switch (Number(effectType)) {
    case 0:
      return "Level (Effect OFF)";
    case 1:
      return "Pitch Slide Amount";
    case 2:
      return "Flanger Depth";
    case 3:
      return "Phaser Depth";
    case 4:
      return "Sweep Amount";
    case 5:
      return "Filter Freq / Band";
    case 6:
      return "Ring Mod Freq";
    default:
      return "Effect Amount";
  }
};

  const loadPresetFromUrl = async (url, applyTSLData) => {
    if (!url) return;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Network response was not ok");
      const text = await response.text();
      applyTSLData(text);
    } catch (error) {
      console.error("Failed to load preset:", error);
      alert("Could not load the selected preset. Make sure the file exists in the repository.");
    }
  };

export {
  makeDistortionCurve,
  makeBitCrusherCurve,
  mapFreq,
  mapGain,
  mapQ,
  getEffectParamName,
  loadPresetFromUrl,
};  