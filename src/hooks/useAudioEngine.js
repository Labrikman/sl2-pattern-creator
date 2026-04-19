import { useEffect, useRef } from 'react';
import {  makeDistortionCurve, makeBitCrusherCurve, mapFreq, mapGain, mapQ, getEffectParamName, loadPresetFromUrl } from "../utils/functions"; 

export const useAudioEngine = (isPlaying, masterVolume, bossParams, synthConfig, audioSource, lfoConfig) => {
  const audioCtx = useRef(null);
  const nodes = useRef({ ch1: {}, ch2: {}, master: {}, guitarIn: null });
  const mediaStreamRef = useRef(null);
  const liveSourceNodeRef = useRef(null);

  const initAudio = (fx, generateReverbBuffer) => {
    if (!audioCtx.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx.current = new Ctx();
      const ctx = audioCtx.current;
      const guitarIn = ctx.createGain();
      guitarIn.gain.value = 0; 
      nodes.current.guitarIn = guitarIn;
      const masterIn = ctx.createGain();
      const masterOut = ctx.createGain();
      masterOut.gain.value = masterVolume / 100;
      masterOut.connect(ctx.destination);
      // COMPRESSOR
      const compressor = ctx.createDynamicsCompressor();
      const noiseGate = ctx.createGain();
      const gateAnalyser = ctx.createAnalyser();
      gateAnalyser.fftSize = 512;
      gateAnalyser.smoothingTimeConstant = 0.8;
      // INPUT BOSS PARAMS
      masterIn.connect(compressor);
      // COMP → GATE & ANALYSEUR
      compressor.connect(noiseGate);
      compressor.connect(gateAnalyser); // L'analyseur écoute en parallèle
      // EQ (Parametric EQ simplifié)
      const eqLow = ctx.createBiquadFilter();
      eqLow.type = "lowshelf";
      const eqMid1 = ctx.createBiquadFilter();
      eqMid1.type = "peaking";
      const eqMid2 = ctx.createBiquadFilter();
      eqMid2.type = "peaking";
      const eqHigh = ctx.createBiquadFilter();
      eqHigh.type = "highshelf";
      const eqOutputGain = ctx.createGain();
      // MIXER (dry/wet simple)
      const dryGain = ctx.createGain();
      const wetGain = ctx.createGain();
      const chorusDelay = ctx.createDelay();
      const chorusLFO = ctx.createOscillator();
      const chorusLFOGain = ctx.createGain();
      const chorusGain = ctx.createGain();
      const phaserLFO = ctx.createOscillator();
      const phaserDepth = ctx.createGain();
      const phaserGain = ctx.createGain();
      chorusDelay.delayTime.value = 0.03;
      chorusLFO.frequency.value = 1.5;
      chorusLFOGain.gain.value = 0.005;
      chorusLFO.connect(chorusLFOGain);
      chorusLFOGain.connect(chorusDelay.delayTime);
      chorusLFO.start();
      chorusGain.gain.value = 0;
      phaserLFO.frequency.value = 0.5;
      phaserDepth.gain.value = 800;
      phaserGain.gain.value = 0;
      let lastPhaserNode = masterIn;
      for (let i = 0; i < 4; i++) {
        const pFilter = ctx.createBiquadFilter();
        pFilter.type = "allpass";
        pFilter.frequency.value = 1000;
        phaserLFO.connect(phaserDepth);
        phaserDepth.connect(pFilter.frequency);
        lastPhaserNode.connect(pFilter);
        lastPhaserNode = pFilter;
      }
      phaserLFO.start();
      lastPhaserNode.connect(phaserGain);
    //   SUPPLEMENTARIES EFFECTS
      const delayNode = ctx.createDelay(3.0);
      const delayFeedback = ctx.createGain();
      const delayFilter = ctx.createBiquadFilter();
      const delayGain = ctx.createGain();
      delayNode.delayTime.value = fx.delayTime;
      delayFeedback.gain.value = fx.delayFeedback / 100;
      delayFilter.type = "lowpass";
      delayFilter.frequency.value = 20000;
      delayGain.gain.value = fx.delayMix / 100;
      delayNode.connect(delayFilter);
      delayFilter.connect(delayFeedback);
      delayFeedback.connect(delayNode);
      delayNode.connect(delayGain);
      const reverbNode = ctx.createConvolver();
      reverbNode.buffer = generateReverbBuffer(ctx, fx.reverbType);
      const reverbGain = ctx.createGain();
      reverbGain.gain.value = fx.reverbMix / 100;
      reverbNode.connect(reverbGain);
      masterIn.connect(chorusDelay);
      chorusDelay.connect(chorusGain);
      chorusGain.connect(masterOut);
      phaserGain.connect(masterOut);
      masterIn.connect(delayNode);
      delayGain.connect(masterOut);
      masterIn.connect(reverbNode);
      reverbGain.connect(masterOut);
      masterIn.connect(masterOut);
      // INPUT BOSS PARAMS
      masterIn.connect(compressor);
      // COMP → GATE
      compressor.connect(noiseGate);
      // GATE → EQ
      noiseGate.connect(eqLow);
      noiseGate.connect(eqLow);
      eqLow.connect(eqMid1);
      eqMid1.connect(eqMid2);
      eqMid2.connect(eqHigh);
      eqHigh.connect(eqOutputGain);
      eqOutputGain.connect(wetGain);
      // EQ → MIXER
      masterIn.connect(dryGain);
      // MIXER → OUT
      wetGain.connect(masterOut);
      dryGain.connect(masterOut);
      nodes.current.master = {
        gain: masterOut,
        compressor,
        noiseGate,
        eqLow,
        eqMid1,
        eqMid2,
        eqHigh,
        eqOutputGain,
        dryGain,
        wetGain,
        gateAnalyser,
        // currentReverbType: fx.reverbType,
        // delayNode,
        // delayFeedback,
        // delayFilter,
        // delayGain,
        // reverbNode,
        // reverbGain,
        // chorusGain,
        // phaserGain,
      };
      
      const createChain = (panValue) => {
        const oscMasterGain = ctx.createGain();
        const osc = ctx.createOscillator();
        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();
        const upOsc = ctx.createOscillator();
        const upGain = ctx.createGain();
        const preGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        const slicerGain = ctx.createGain();
        const panner = ctx.createStereoPanner();
        const distNode = ctx.createWaveShaper();
        const bitNode = ctx.createWaveShaper();
        const lfoOsc = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        oscMasterGain.gain.value = 1;

        osc.type = "sawtooth";
        subOsc.type = "square";
        upOsc.type = "sawtooth";

        subGain.gain.value = synthConfig.octSub / 100;
        upGain.gain.value = synthConfig.octUp / 100;
        preGain.gain.value = synthConfig.gain / 100;
        distNode.curve = makeDistortionCurve(synthConfig.dist * 4);
        distNode.oversample = "4x";
        bitNode.curve = makeBitCrusherCurve(synthConfig.bitDepth);
        filter.type = "bandpass";
        filter.Q.value = 5;
        slicerGain.gain.value = 0;
        panner.pan.value = panValue;
        lfoOsc.type = lfoConfig.wave;
        lfoOsc.frequency.value = lfoConfig.rate;
        lfoGain.gain.value = lfoConfig.depth;

        lfoGain.gain.value = lfoConfig.depth * 20;

        osc.connect(oscMasterGain);
        subOsc.connect(subGain);
        subGain.connect(oscMasterGain);
        subGain.connect(preGain);
        upOsc.connect(upGain);
        upGain.connect(oscMasterGain);
        
        oscMasterGain.connect(preGain);
        nodes.current.guitarIn.connect(preGain); 
        
        preGain.connect(distNode);
        distNode.connect(bitNode);
        bitNode.connect(filter);
        filter.connect(slicerGain);
        slicerGain.connect(panner);
        panner.connect(masterIn);
        
        // osc.connect(preGain);
        // upGain.connect(preGain);
        // preGain.connect(distNode);

        lfoOsc.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        osc.start();
        subOsc.start();
        upOsc.start();
        lfoOsc.start();

        return {
          osc,
          subOsc,
          upOsc,
          subGain,
          upGain,
          preGain,
          filter,
          slicerGain,
          distNode,
          bitNode,
          oscMasterGain,
          lfoOsc,
          lfoGain,
        };
      };
      nodes.current.ch1 = createChain(-0.8);
      nodes.current.ch2 = createChain(0.8);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      initAudio();
      if (audioCtx.current.state === "suspended") audioCtx.current.resume();
    }
  }, [isPlaying]);

  // L'immense useEffect qui met à jour les paramètres (Gains, EQs, LFO...)
  useEffect(() => {
    if (!audioCtx.current) return;
    // ... mise à jour des targetAtTime
  }, [masterVolume, bossParams, synthConfig, audioSource, lfoConfig]);

  return { audioCtx, nodes, mediaStreamRef, liveSourceNodeRef };
};
