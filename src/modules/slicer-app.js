import React, { useState, useEffect, useRef } from "react";
import { COMMUNITY_PRESETS } from "../presets/presets-manager";
import { generateEmptyTrack, MAX_STEPS, stepNumber } from "../utils/constants";
import {  makeDistortionCurve, makeBitCrusherCurve, mapFreq, mapGain, mapQ, getEffectParamName } from "../utils/functions"; 

// ==========================================
// 2. MAIN COMPONENT (Application)
// ==========================================
const SlicerApp = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [attack, setAttack] = useState(50);
  const [duty, setDuty] = useState(50);
  const [masterVolume, setMasterVolume] = useState(50);
  const [currentStep, setCurrentStep] = useState(0);
  const [editStepCh1, setEditStepCh1] = useState(0);
  const [editStepCh2, setEditStepCh2] = useState(0);
  const [synthConfig, setSynthConfig] = useState({
    pitch: 0,
    gain: 100,
    dist: 0,
    bitDepth: 16,
    octSub: 0,
    octUp: 0,
  });
  // const [lfoConfig, setLfoConfig] = useState({
  //   wave: "sine",
  //   rate: 0.5,
  //   depth: 0,
  // });
  // const [fx, setFx] = useState({
  //   chorusMix: 0,
  //   phaserMix: 0,
  //   delayMix: 0,
  //   delayTime: 0.3,
  //   delayFeedback: 40,
  //   delayType: "digital",
  //   reverbMix: 0,
  //   reverbType: "hall",
  // });
  const [ch1Steps, setCh1Steps] = useState(generateEmptyTrack());
  const [ch2Steps, setCh2Steps] = useState(generateEmptyTrack());
  // --- GLOBAL STATE FOR EXHAUSTIVE BOSS SL-2 PARAMS ---
  const [liveSetName, setLiveSetName] = useState("My Live Set");
  const [bossParams, setBossParams] = useState({
    patchName: "MY SL2 PATCH",
    slicer1Header: [50, 1, 0, 0],
    slicer2Header: [50, 1, 0, 0],

    comp: [0, 50, 50, 60, 50, 12, 0],
    divider: [1, 9],
    mixer: [0, 1, 100, 0, 100],
    ns: [1, 30, 30],
    peq: [1, 20, 20, 17, 14, 1, 20, 23, 1, 20, 0, 29],
    beat: [0, 1],

    phaser1: [0, 0, 70, 50, 0, 55, 0, 0, 100, 0],
    flanger1: [0, 25, 50, 80, 75, 0, 0, 0, 0, 100, 0],
    tremolo1: [0, 100, 85, 0, 50, 50],
    overtone1: [0, 50, 50, 50, 100, 35, 50, 50, 1],

    phaser2: [0, 0, 70, 50, 0, 55, 0, 0, 100, 0],
    flanger2: [0, 25, 50, 80, 75, 0, 0, 0, 0, 100, 0],
    tremolo2: [0, 100, 85, 0, 50, 50],
    overtone2: [0, 50, 50, 50, 100, 35, 50, 50, 1],
  });

  const updateBossParam = (effectName, index, value) => {
    setBossParams((prev) => {
      const newArray = [...prev[effectName]];
      newArray[index] = Number(value);
      return { ...prev, [effectName]: newArray };
    });
  };

  // --- RANDOMIZER FUNCTION ---
  const randomizeAll = () => {
    const rand = (min, max) =>
      Math.floor(Math.random() * (max - min + 1)) + min;

    const generateRandomSteps = () =>
      Array.from({ length: MAX_STEPS }, () => ({
        level: Math.random() > 0.4 ? rand(40, 100) : 0,
        pitch: rand(-12, 12),
        filter: rand(0, 100),
        length: rand(10, 100),
      }));

    const randomIndex1 = rand(0, 3);
    const randomIndex2 = rand(0, 3);

    setCh1Steps(generateRandomSteps());
    setCh2Steps(generateRandomSteps());

    const randomEff1 = rand(0, 6);
    const randomEff2 = rand(0, 6);

    const randomizeFxArray = (arr) =>
      arr.map((val, idx) => (idx > 0 ? rand(0, 100) : val));

    setBossParams((prev) => ({
      ...prev,
      slicer1Header: [50, prev.slicer1Header[1], randomEff1, randomIndex1],
      slicer2Header: [50, prev.slicer2Header[1], randomEff2, randomIndex2],
      phaser1: randomizeFxArray(prev.phaser1),
      flanger1: randomizeFxArray(prev.flanger1),
      tremolo1: randomizeFxArray(prev.tremolo1),
      overtone1: randomizeFxArray(prev.overtone1),
      phaser2: randomizeFxArray(prev.phaser2),
      flanger2: randomizeFxArray(prev.flanger2),
      tremolo2: randomizeFxArray(prev.tremolo2),
      overtone2: randomizeFxArray(prev.overtone2),
    }));
  };

  // --- COPY CHANNEL FUNCTION ---
  const copyChannel = (sourceChannel) => {
    if (sourceChannel === 1) {
      setCh2Steps(ch1Steps.map((step) => ({ ...step })));
      setBossParams((prev) => ({
        ...prev,
        slicer2Header: [...prev.slicer1Header],
        phaser2: [...prev.phaser1],
        flanger2: [...prev.flanger1],
        tremolo2: [...prev.tremolo1],
        overtone2: [...prev.overtone1],
      }));
    } else {
      setCh1Steps(ch2Steps.map((step) => ({ ...step })));
      setBossParams((prev) => ({
        ...prev,
        slicer1Header: [...prev.slicer2Header],
        phaser1: [...prev.phaser2],
        flanger1: [...prev.flanger2],
        tremolo1: [...prev.tremolo2],
        overtone1: [...prev.overtone2],
      }));
    }
  };

  const audioCtx = useRef(null);
  const timerRef = useRef(null);
  const nodes = useRef({ ch1: {}, ch2: {}, master: {} });

  // ==========================================
  // --- DYNAMIC IMPORT / EXPORT FUNCTIONS ---
  // ==========================================
  const exportTSL = () => {
    const toHex = (val) =>
      Math.max(0, Math.min(255, Math.round(val)))
        .toString(16)
        .toUpperCase()
        .padStart(2, "0");

    const formatPatchName = (name) => {
      const hexArray = Array(16).fill("20");
      for (let i = 0; i < Math.min(name.length, 16); i++) {
        hexArray[i] = name
          .charCodeAt(i)
          .toString(16)
          .toUpperCase()
          .padStart(2, "0");
      }
      return hexArray;
    };

    const formatSlicerData = (steps, header) => {
      const data = Array(100).fill("00");
      data[0] = toHex(header[0]);
      data[1] = toHex(header[1]);
      data[2] = toHex(header[2]);
      data[3] = toHex(header[3]);

      steps.forEach((step, i) => {
        if (i < 24) {
          data[4 + i] = toHex(step.length !== undefined ? step.length : 50);
          data[28 + i] = toHex(step.level);
          data[52 + i] = toHex(step.filter);
          data[76 + i] = toHex(step.pitch + 12);
        }
      });
      return data;
    };

    const tslContent = {
      name: liveSetName,
      formatRev: "0001",
      device: "SL-2",
      data: [
        [
          {
            memo: {
              memo: "Exported via Labrik Editor",
              isToneCentralPatch: true,
            },
            paramSet: {
              "PATCH%COM": formatPatchName(bossParams.patchName),
              "PATCH%SLICER(1)": formatSlicerData(
                ch1Steps,
                bossParams.slicer1Header,
              ),
              "PATCH%SLICER(2)": formatSlicerData(
                ch2Steps,
                bossParams.slicer2Header,
              ),
              "PATCH%COMP": bossParams.comp.map(toHex),
              "PATCH%DIVIDER": bossParams.divider.map(toHex),
              "PATCH%PHASER(1)": bossParams.phaser1.map(toHex),
              "PATCH%PHASER(2)": bossParams.phaser2.map(toHex),
              "PATCH%FLANGER(1)": bossParams.flanger1.map(toHex),
              "PATCH%FLANGER(2)": bossParams.flanger2.map(toHex),
              "PATCH%TREMOLO(1)": bossParams.tremolo1.map(toHex),
              "PATCH%TREMOLO(2)": bossParams.tremolo2.map(toHex),
              "PATCH%OVERTONE(1)": bossParams.overtone1.map(toHex),
              "PATCH%OVERTONE(2)": bossParams.overtone2.map(toHex),
              "PATCH%MIXER": bossParams.mixer.map(toHex),
              "PATCH%NS": bossParams.ns.map(toHex),
              "PATCH%PEQ": bossParams.peq.map(toHex),
              "PATCH%BEAT": bossParams.beat.map(toHex),
            },
          },
        ],
      ],
    };

    const blob = new Blob([JSON.stringify(tslContent, null, 2)], {
      type: "application/json",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${bossParams.patchName.replace(/\s+/g, "_").toLowerCase()}.tsl`;
    link.click();
  };

  // --- FONCTION PARTAGÉE POUR APPLIQUER LES DONNÉES TSL ---
  const applyTSLData = (jsonString) => {
    try {
      const json = JSON.parse(jsonString);
      if (json.name) setLiveSetName(json.name);

      const patch = json.data[0][0].paramSet;
      const fromHex = (h) => parseInt(h, 16);
      const parseArray = (hexArray) => (hexArray ? hexArray.map(fromHex) : []);

      const importedName = patch["PATCH%COM"]
        .map((h) => String.fromCharCode(fromHex(h)))
        .join("")
        .trim();

      const parseSlicer = (data) =>
        Array.from({ length: 24 }, (_, i) => ({
          length: fromHex(data[4 + i]),
          level: fromHex(data[28 + i]),
          filter: fromHex(data[52 + i]),
          pitch: fromHex(data[76 + i]) - 12,
        }));

      setCh1Steps(parseSlicer(patch["PATCH%SLICER(1)"]));
      setCh2Steps(parseSlicer(patch["PATCH%SLICER(2)"]));

      const sl1Data = patch["PATCH%SLICER(1)"];
      const sl2Data = patch["PATCH%SLICER(2)"];
      
      setBossParams({
        patchName: importedName || "IMPORTED PATCH",
        slicer1Header: [fromHex(sl1Data[0]), fromHex(sl1Data[1]), fromHex(sl1Data[2]), fromHex(sl1Data[3])],
        slicer2Header: [fromHex(sl2Data[0]), fromHex(sl2Data[1]), fromHex(sl2Data[2]), fromHex(sl2Data[3])],
        comp: parseArray(patch["PATCH%COMP"]),
        divider: parseArray(patch["PATCH%DIVIDER"]),
        mixer: parseArray(patch["PATCH%MIXER"]),
        ns: parseArray(patch["PATCH%NS"]),
        peq: parseArray(patch["PATCH%PEQ"]),
        beat: parseArray(patch["PATCH%BEAT"]),
        phaser1: parseArray(patch["PATCH%PHASER(1)"]),
        phaser2: parseArray(patch["PATCH%PHASER(2)"]),
        flanger1: parseArray(patch["PATCH%FLANGER(1)"]),
        flanger2: parseArray(patch["PATCH%FLANGER(2)"]),
        tremolo1: parseArray(patch["PATCH%TREMOLO(1)"]),
        tremolo2: parseArray(patch["PATCH%TREMOLO(2)"]),
        overtone1: parseArray(patch["PATCH%OVERTONE(1)"]),
        overtone2: parseArray(patch["PATCH%OVERTONE(2)"]),
      });
    } catch (err) {
      alert("Error parsing .tsl data.");
    }
  };

  const importTSL = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => applyTSLData(event.target.result); 
    reader.readAsText(file);
    e.target.value = "";
  };

  const loadPresetFromUrl = async (url) => {
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

  // --- AUDIO ENGINE ---
  useEffect(() => {
    if (!audioCtx.current) return;
    const time = audioCtx.current.currentTime;
    if (nodes.current.master.gain)
      nodes.current.master.gain.gain.setTargetAtTime(
        masterVolume / 100,
        time,
        0.05,
      );
    const m = nodes.current.master;
    // if (m.delayGain)
    //   m.delayGain.gain.setTargetAtTime(fx.delayMix / 100, time, 0.05);
    // if (m.delayNode)
    //   m.delayNode.delayTime.setTargetAtTime(fx.delayTime, time, 0.05);
    // if (m.delayFeedback)
    //   m.delayFeedback.gain.setTargetAtTime(fx.delayFeedback / 100, time, 0.05);
    // if (m.delayFilter)
    //   m.delayFilter.frequency.setTargetAtTime(
    //     fx.delayType === "analog" ? 1500 : 20000,
    //     time,
    //     0.05,
    //   );
    // if (m.reverbGain)
    //   m.reverbGain.gain.setTargetAtTime(fx.reverbMix / 100, time, 0.05);
    // if (m.reverbNode && m.currentReverbType !== fx.reverbType) {
    //   m.reverbNode.buffer = generateReverbBuffer(
    //     audioCtx.current,
    //     fx.reverbType,
    //   );
    //   m.currentReverbType = fx.reverbType;
    // }
    // if (m.chorusGain)
    //   m.chorusGain.gain.setTargetAtTime(fx.chorusMix / 100, time, 0.05);
    // if (m.phaserGain)
    //   m.phaserGain.gain.setTargetAtTime(fx.phaserMix / 100, time, 0.05);
    // BOSS PARAMS
    const mixer = bossParams.mixer;
    if (m.dryGain && m.wetGain) {
      m.wetGain.gain.setTargetAtTime(mixer[2] / 100, time, 0.05);
      m.dryGain.gain.setTargetAtTime(mixer[4] / 100, time, 0.05);
    }
    const comp = bossParams.comp;
    if (m.compressor) {
      m.compressor.threshold.setTargetAtTime(-comp[1], time, 0.05);
      m.compressor.ratio.setTargetAtTime(1 + comp[2] / 10, time, 0.05);
      m.compressor.attack.setTargetAtTime(comp[3] / 1000, time, 0.05);
      m.compressor.release.setTargetAtTime(comp[4] / 1000, time, 0.05);
    }
    // const ns = bossParams.ns;
    // if (m.noiseGate) {
    //   const threshold = ns[1] / 100;
    //   const gateValue = masterVolume / 100 > threshold ? 1 : 0;
    //   m.noiseGate.gain.setTargetAtTime(gateValue, time, 0.05);
    // }
    const peq = bossParams.peq;
    if (m.eqLow && peq[0]) {
      m.eqLow.frequency.setTargetAtTime(mapFreq(peq[2]), time, 0.05);
      m.eqLow.gain.setTargetAtTime(mapGain(peq[1]), time, 0.05);
    }
    if (m.eqMid1) {
      m.eqMid1.frequency.setTargetAtTime(mapFreq(peq[3]), time, 0.05);
      m.eqMid1.gain.setTargetAtTime(mapGain(peq[4]), time, 0.05);
      m.eqMid1.Q.value = mapQ(peq[5]);
    }
    if (m.eqMid2) {
      m.eqMid2.frequency.setTargetAtTime(mapFreq(peq[6]), time, 0.05);
      m.eqMid2.gain.setTargetAtTime(mapGain(peq[7]), time, 0.05);
      m.eqMid2.Q.value = mapQ(peq[8]);
    }
    if (m.eqHigh) {
      m.eqHigh.frequency.setTargetAtTime(mapFreq(peq[9]), time, 0.05);
      m.eqHigh.gain.setTargetAtTime(mapGain(peq[10]), time, 0.05);
    }
    if (m.eqOutputGain) {
      m.eqOutputGain.gain.setTargetAtTime(peq[11] / 100, time, 0.05);
    }
    ["ch1", "ch2"].forEach((ch) => {
      const channel = nodes.current[ch];
      if (!channel.osc) return;
      channel.preGain.gain.setTargetAtTime(synthConfig.gain / 100, time, 0.05);
      channel.distNode.curve = makeDistortionCurve(synthConfig.dist * 4);
      channel.bitNode.curve = makeBitCrusherCurve(synthConfig.bitDepth);
      channel.subGain.gain.setTargetAtTime(
        synthConfig.octSub / 100,
        time,
        0.05,
      );
      channel.upGain.gain.setTargetAtTime(synthConfig.octUp / 100, time, 0.05);
      // channel.lfoOsc.type = lfoConfig.wave;
      // channel.lfoOsc.frequency.setTargetAtTime(lfoConfig.rate, time, 0.05);
      // channel.lfoGain.gain.setTargetAtTime(lfoConfig.depth, time, 0.05);
    });
  }, [
    masterVolume,
    bossParams.mixer,
    bossParams.comp,
    bossParams.ns,
    bossParams.peq,
    synthConfig,
    // lfoConfig,
    // fx,
  ]);

  // --- ENVELOPE FOLLOWER (NOISE SUPPRESSOR) ---
  useEffect(() => {
    let animationId;

    const trackEnvelope = () => {
      const m = nodes.current.master;
      if (m.gateAnalyser && m.noiseGate && isPlaying) {
        const ns = bossParams.ns;
        const isEnabled = ns[0] === 1;
        const thresholdParam = ns[1] / 100;
        const releaseParam = ns[2] / 100; // Le paramètre Release de l'interface

        if (!isEnabled) {
          // Si le Gate est éteint, la porte est grande ouverte (gain = 1)
          m.noiseGate.gain.setTargetAtTime(
            1,
            audioCtx.current.currentTime,
            0.05,
          );
        } else {
          // On récupère le signal audio du moment
          const dataArray = new Float32Array(m.gateAnalyser.frequencyBinCount);
          m.gateAnalyser.getFloatTimeDomainData(dataArray);

          // On calcule le volume réel (Root Mean Square / RMS)
          let sumSquares = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sumSquares += dataArray[i] * dataArray[i];
          }
          const rms = Math.sqrt(sumSquares / dataArray.length);

          const time = audioCtx.current.currentTime;
          // Ajustement mathématique : le RMS d'un signal fort tourne souvent autour de 0.2/0.4.
          // On adapte ton threshold (0-1) à cette échelle réelle.
          const actualThreshold = thresholdParam * 0.4;

          if (rms > actualThreshold) {
            // Le son est assez fort : on ouvre la porte instantanément (10ms)
            m.noiseGate.gain.setTargetAtTime(1, time, 0.01);
          } else {
            // Le son est trop faible : on referme doucement la porte selon ton réglage Release
            // On ne descend pas à 0 parfait pour éviter les artefacts audios (0.001 est idéal)
            m.noiseGate.gain.setTargetAtTime(
              0.001,
              time,
              releaseParam > 0 ? releaseParam : 0.05,
            );
          }
        }
      }

      // On boucle à la prochaine frame
      animationId = requestAnimationFrame(trackEnvelope);
    };

    if (isPlaying) {
      trackEnvelope();
    }

    return () => cancelAnimationFrame(animationId); // On nettoie quand on fait STOP
  }, [isPlaying, bossParams.ns]);

  const bossParamsRef = useRef(bossParams);
  useEffect(() => {
    bossParamsRef.current = bossParams;
  }, [bossParams]);

  const initAudio = () => {
    if (!audioCtx.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx.current = new Ctx();
      const ctx = audioCtx.current;
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
      // const chorusDelay = ctx.createDelay();
      // chorusDelay.delayTime.value = 0.03;
      // const chorusLFO = ctx.createOscillator();
      // const chorusLFOGain = ctx.createGain();
      // chorusLFO.frequency.value = 1.5;
      // chorusLFOGain.gain.value = 0.005;
      // chorusLFO.connect(chorusLFOGain);
      // chorusLFOGain.connect(chorusDelay.delayTime);
      // chorusLFO.start();
      // const chorusGain = ctx.createGain();
      // chorusGain.gain.value = 0;
      // const phaserLFO = ctx.createOscillator();
      // phaserLFO.frequency.value = 0.5;
      // const phaserDepth = ctx.createGain();
      // phaserDepth.gain.value = 800;
      // const phaserGain = ctx.createGain();
      // phaserGain.gain.value = 0;
      let lastPhaserNode = masterIn;
      for (let i = 0; i < 4; i++) {
        const pFilter = ctx.createBiquadFilter();
        pFilter.type = "allpass";
        pFilter.frequency.value = 1000;
        // phaserLFO.connect(phaserDepth);
        // phaserDepth.connect(pFilter.frequency);
        lastPhaserNode.connect(pFilter);
        lastPhaserNode = pFilter;
      }
      // phaserLFO.start();
      // lastPhaserNode.connect(phaserGain);
      // SUPPLEMENTARIES EFFECTS
      // const delayNode = ctx.createDelay(3.0);
      // const delayFeedback = ctx.createGain();
      // const delayFilter = ctx.createBiquadFilter();
      // const delayGain = ctx.createGain();
      // delayNode.delayTime.value = fx.delayTime;
      // delayFeedback.gain.value = fx.delayFeedback / 100;
      // delayFilter.type = "lowpass";
      // delayFilter.frequency.value = 20000;
      // delayGain.gain.value = fx.delayMix / 100;
      // delayNode.connect(delayFilter);
      // delayFilter.connect(delayFeedback);
      // delayFeedback.connect(delayNode);
      // delayNode.connect(delayGain);
      // const reverbNode = ctx.createConvolver();
      // reverbNode.buffer = generateReverbBuffer(ctx, fx.reverbType);
      // const reverbGain = ctx.createGain();
      // reverbGain.gain.value = fx.reverbMix / 100;
      // reverbNode.connect(reverbGain);
      // masterIn.connect(chorusDelay);
      // chorusDelay.connect(chorusGain);
      // chorusGain.connect(masterOut);
      // phaserGain.connect(masterOut);
      // masterIn.connect(delayNode);
      // delayGain.connect(masterOut);
      // masterIn.connect(reverbNode);
      // reverbGain.connect(masterOut);
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
        // const lfoOsc = ctx.createOscillator();
        // const lfoGain = ctx.createGain();
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
        // lfoOsc.type = lfoConfig.wave;
        // lfoOsc.frequency.value = lfoConfig.rate;
        // lfoGain.gain.value = lfoConfig.depth;
        osc.connect(preGain);
        subOsc.connect(subGain);
        subGain.connect(preGain);
        upOsc.connect(upGain);
        upGain.connect(preGain);
        preGain.connect(distNode);
        distNode.connect(bitNode);
        bitNode.connect(filter);
        filter.connect(slicerGain);
        slicerGain.connect(panner);
        panner.connect(masterIn);
        // lfoOsc.connect(lfoGain);
        // lfoGain.connect(filter.frequency);
        osc.start();
        subOsc.start();
        upOsc.start();
        // lfoOsc.start();
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
          // lfoOsc,
          // lfoGain,
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
      const divider = bossParams.divider[1] || 4;
      const stepDuration = 60 / bpm / (divider / 2);
      timerRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          const currentParams = bossParamsRef.current;
          const stepCountCh1 = stepNumber[currentParams.slicer1Header[3]];
          const stepCountCh2 = stepNumber[currentParams.slicer2Header[3]];
          const maxSteps = Math.max(stepCountCh1, stepCountCh2);
          const nextStep = (prev + 1) % maxSteps;
          const triggerStep = (stepData, channelNodes) => {
            const { osc, subOsc, upOsc, filter, slicerGain } = channelNodes;
            if (stepData.level === 0) return;
            const beat = currentParams.beat;
            const groove = beat[1] ? 0.02 : 0;
            const timeOffset = (Math.random() - 0.5) * groove;
            const now = audioCtx.current.currentTime;
            const time = Math.max(now, now + timeOffset);
            const totalPitch = stepData.pitch + Number(synthConfig.pitch);
            const freq = 220 * Math.pow(2, totalPitch / 12);
            const filterBaseFreq = 100 + stepData.filter * 39;
            const isAccentStep = beat[0] && nextStep % 4 === 0;
            const accentBoost = isAccentStep ? 1.3 : 1;
            const targetVolume = (stepData.level / 100) * accentBoost;
            const attackDuration = stepDuration * (attack / 100);
            const stepBaseLength =
              stepData.length !== undefined ? stepData.length : 50;
            const finalLengthRatio = (stepBaseLength / 100) * (duty / 100);
            let releaseTime = time + stepDuration * finalLengthRatio;
            osc.frequency.setValueAtTime(freq, time);
            subOsc.frequency.setValueAtTime(freq / 2, time);
            upOsc.frequency.setValueAtTime(freq * 2, time);
            filter.frequency.setValueAtTime(filterBaseFreq, time);
            if (releaseTime > time + stepDuration)
              releaseTime = time + stepDuration - 0.01;
            const shape = (t) => Math.pow(t, 3); // tweakable
            slicerGain.gain.setValueAtTime(0, time);
            for (let i = 0; i <= 1; i += 0.1) {
              const t = time + i * attackDuration;
              slicerGain.gain.setValueAtTime(targetVolume, releaseTime);
              slicerGain.gain.linearRampToValueAtTime(0, releaseTime + 0.05); // Smooth 50ms fade out to avoid clicking
              slicerGain.gain.setValueAtTime(shape(i) * targetVolume, t);
              // Add this right after the attack `for` loop
            }
          };
          if (nextStep < ch1Steps.length) {
            triggerStep(ch1Steps[nextStep], nodes.current.ch1);
          }
          if (nextStep < ch1Steps.length) {
            triggerStep(ch2Steps[nextStep], nodes.current.ch2);
          }
          return nextStep;
        });
      }, stepDuration * 1000);
    } else {
      clearInterval(timerRef.current);
      if (audioCtx.current) {
        nodes.current.ch1.slicerGain.gain.cancelScheduledValues(
          audioCtx.current.currentTime,
        );
        nodes.current.ch1.slicerGain.gain.value = 0;
        nodes.current.ch2.slicerGain.gain.cancelScheduledValues(
          audioCtx.current.currentTime,
        );
        nodes.current.ch2.slicerGain.gain.value = 0;
      }
    }
    return () => clearInterval(timerRef.current);
  }, [
    isPlaying,
    bpm,
    attack,
    duty,
    synthConfig.pitch,
    ch1Steps,
    ch2Steps,
    bossParams.divider[1],
  ]);

  const updateStep = (channel, index, field, value) => {
    const val = Number(value);
    if (channel === 1) {
      const newSteps = [...ch1Steps];
      newSteps[index] = { ...newSteps[index], [field]: val };
      setCh1Steps(newSteps);
    } else {
      const newSteps = [...ch2Steps];
      newSteps[index] = { ...newSteps[index], [field]: val };
      setCh2Steps(newSteps);
    }
  };

  const toggleStep = (channel, index) => {
    if (channel === 1) {
      const newSteps = [...ch1Steps];
      newSteps[index].level = newSteps[index].level > 0 ? 0 : 100;
      setCh1Steps(newSteps);
    } else {
      const newSteps = [...ch2Steps];
      newSteps[index].level = newSteps[index].level > 0 ? 0 : 100;
      setCh2Steps(newSteps);
    }
  };

  const renderGenericEffect = (title, stateKey, customLabels = []) => {
    const values = bossParams[stateKey];
    if (!values) return null;
    return (
      <div
        style={{
          background: "#222",
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "10px",
          border: "1px solid #444",
        }}
      >
        <h4 style={{ margin: "0 0 10px 0", color: "#ccc" }}>{title}</h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
            gap: "15px",
          }}
        >
          {values.map((val, idx) => {
            const label =
              customLabels[idx] || (idx === 0 ? "Enable" : `Param ${idx}`);
            return (
              <label
                key={idx}
                style={{
                  fontSize: "11px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <span style={{ color: "#888", marginBottom: "4px" }}>
                  {label}: {val}
                </span>
                <input
                  type='range'
                  min='0'
                  max={idx === 0 ? "1" : "100"}
                  value={val}
                  onChange={(e) =>
                    updateBossParam(stateKey, idx, e.target.value)
                  }
                />
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "sans-serif",
        maxWidth: "1200px",
        margin: "auto",
        background: "#111",
        color: "#eee",
        borderRadius: "10px",
      }}
    >
      {/* --- HEADER & EXPORT --- */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: "20px",
          borderBottom: "1px solid #333",
          paddingBottom: "15px",
        }}
      >
        <h1 style={{ margin: 0, color: "#00e5ff", fontSize: "24px" }}>
          SL-2 TSL Editor
        </h1>
        <p style={{ color: "#656565", fontSize: "10px" }}>by Labrikman</p>
        <div
          style={{
            display: "flex",
            gap: "15px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <label style={{ fontSize: "12px", color: "#888" }}>
            Live Set:
            <input
              type='text'
              value={liveSetName}
              onChange={(e) => setLiveSetName(e.target.value)}
              style={{
                marginLeft: "5px",
                padding: "5px",
                background: "#222",
                color: "#fff",
                border: "1px solid #444",
                borderRadius: "4px",
                width: "120px",
              }}
            />
          </label>
          <label style={{ fontSize: "12px", color: "#888" }}>
            Patch Name:
            <input
              type='text'
              maxLength='16'
              value={bossParams.patchName}
              onChange={(e) =>
                setBossParams((p) => ({
                  ...p,
                  patchName: e.target.value.toUpperCase(),
                }))
              }
              style={{
                marginLeft: "5px",
                padding: "5px",
                background: "#222",
                color: "#fff",
                border: "1px solid #444",
                borderRadius: "4px",
                width: "120px",
              }}
            />
          </label>
          <button
            onClick={randomizeAll}
            style={{
              padding: "8px 15px",
              background: "#F0F",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            ☢︎ RANDOMIZE
          </button>
          <input
            type='file'
            id='fileImport'
            accept='.tsl'
            onChange={importTSL}
            style={{ display: "none" }}
          />
          <button
            onClick={() => document.getElementById("fileImport").click()}
            style={{
              padding: "8px 15px",
              background: "#444",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            ↓ IMPORT .TSL
          </button>
          <button
            onClick={exportTSL}
            style={{
              padding: "8px 15px",
              background: "#0FF",
              color: "#000",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            ↑ EXPORT .TSL
          </button>
          {/* --- COMMUNITY PRESETS DROPDOWN --- */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "#222",
            padding: "5px 10px",
            borderRadius: "4px",
            border: "1px solid #444"
          }}>
            <span style={{ fontSize: "16px" }}>⚒︎</span>
            <select
              onChange={(e) => loadPresetFromUrl(e.target.value)}
              style={{
                background: "#111",
                color: "#0FF",
                border: "1px solid #333",
                padding: "6px",
                borderRadius: "4px",
                fontSize: "12px",
                cursor: "pointer"
              }}
            >
              {COMMUNITY_PRESETS.map((preset, idx) => (
                <option key={idx} value={preset.url}>
                  {preset.label}
                </option>
              ))}
            </select>
            
            {/* link to Pull Request */}
            <a
              href="https://github.com/Labrikman/sl2-pattern-creator/tree/main/public/presets"
              target="_blank"
              rel="noopener noreferrer"
              title="Share your own pattern by submitting a Pull Request!"
              style={{
                fontSize: "11px",
                color: "#F0F",
                textDecoration: "none",
                fontWeight: "bold",
                marginLeft: "5px"
              }}
            >
              + Submit PR
            </a>
          </div>
          {/* BOUTON DONATION (Ko-fi / Buy Me a Coffee) */}
          <a
            href='https://ko-fi.com/labrikman'
            target='_blank'
            rel='noopener noreferrer'
            title='If you like my work and you want to improve this project support me ❤️‍🔥'
            style={{
              padding: "8px 15px",
              background: "#ffffff",
              color: "#F00",
              textDecoration: "none",
              borderRadius: "4px",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              fontSize: "13px",
            }}
          >
            Support Labrikman 🧱
          </a>
        </div>
      </div>

      {/* --- GLOBAL SEQUENCER CONTROLS --- */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "20px",
          marginBottom: "20px",
          padding: "15px",
          background: "#1a1a1a",
          borderRadius: "8px",
          alignItems: "center",
        }}
      >
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            padding: "12px 25px",
            background: isPlaying ? "#ff1744" : "#00e676",
            color: "#000",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "16px",
          }}
        >
          {isPlaying ? "STOP" : "PLAY"}
        </button>
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: "12px",
            color: "#ccc",
          }}
        >
          Master Vol: {masterVolume}%{" "}
          <input
            type='range'
            min='0'
            max='100'
            value={masterVolume}
            onChange={(e) => setMasterVolume(e.target.value)}
          />
        </label>
        <div style={{ borderLeft: "1px solid #444", height: "30px" }}></div>
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: "12px",
            color: "#ccc",
          }}
        >
          BPM:{" "}
          <input
            type='number'
            value={bpm}
            onChange={(e) => setBpm(e.target.value)}
            style={{
              width: "60px",
              background: "#222",
              color: "#fff",
              border: "1px solid #444",
              padding: "4px",
              marginTop: "4px",
            }}
          />
        </label>
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: "12px",
            color: "#ccc",
          }}
        >
          Global Attack: {attack}%{" "}
          <input
            type='range'
            min='1'
            max='100'
            value={attack}
            onChange={(e) => setAttack(e.target.value)}
          />
        </label>
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: "12px",
            color: "#ccc",
          }}
        >
          Global Duty Ratio: {duty}%{" "}
          <input
            type='range'
            min='10'
            max='100'
            value={duty}
            onChange={(e) => setDuty(e.target.value)}
          />
        </label>
      </div>

      {/* --- DROPDOWN: GLOBAL PARAMETERS --- */}
      <details
        style={{
          marginBottom: "30px",
          background: "#1a1a1a",
          borderRadius: "8px",
          border: "1px solid #333",
        }}
      >
        <summary
          style={{
            padding: "15px",
            cursor: "pointer",
            fontWeight: "bold",
            color: "#0FF",
          }}
        >
          ☣︎ Global Effects & Routing
        </summary>
        <div style={{ padding: "15px" }}>
          <p
            style={{
              fontSize: "12px",
              color: "#aaa",
              marginTop: 0,
              marginBottom: "20px",
              fontStyle: "italic",
            }}
          >
            ⚠︎ These effects process the sound continuously. They are completely
            independent of the Slicer's rhythmic chopping.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "15px",
            }}
          >
            {renderGenericEffect("Mixer", "mixer", [
              "Ch2 Bypass",
              "Enable wet signal",
              "Effect Level",
              "Enable dry signal",
              "Direct Level",
            ])}
            {renderGenericEffect("Divider", "divider")}
            {renderGenericEffect("Compressor", "comp")}
            {renderGenericEffect("Noise Suppressor", "ns", [
              "Enable",
              "Threshold",
              "Release",
            ])}
            {renderGenericEffect("Parametric EQ", "peq")}
            {renderGenericEffect("Beat Settings", "beat")}
          </div>
        </div>
      </details>

      {/* --- CHANNELS (1 & 2) --- */}
      <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
        {[1, 2].map((channel) => {
          const steps = channel === 1 ? ch1Steps : ch2Steps;
          const editStepIndex = channel === 1 ? editStepCh1 : editStepCh2;
          const setEditStep = channel === 1 ? setEditStepCh1 : setEditStepCh2;
          const color = channel === 1 ? "#0FF" : "#F0F";
          const headerKey = channel === 1 ? "slicer1Header" : "slicer2Header";
          const effectPrefix = channel === 1 ? "1" : "2";
          const stepCount = stepNumber[bossParams[headerKey][3]];

          const currentEffectType = bossParams[headerKey][2];
          const dynamicEffectName = getEffectParamName(currentEffectType);

          return (
            <div
              key={channel}
              style={{
                border: `1px solid ${color}40`,
                padding: "20px",
                borderRadius: "8px",
                background: "#1a1a1a",
              }}
            >
              {/* Channel Header + Settings */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginBottom: "10px",
                  gap: "15px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "15px" }}
                >
                  <h2 style={{ color: color, margin: 0 }}>Channel {channel}</h2>
                  <button
                    onClick={() => copyChannel(channel)}
                    style={{
                      padding: "6px 12px",
                      background: "#333",
                      color: "#fff",
                      border: `1px solid ${color}80`,
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: "bold",
                    }}
                  >
                    ⏀ COPY TO CH {channel === 1 ? 2 : 1}
                  </button>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    background: "#222",
                    padding: "10px",
                    borderRadius: "6px",
                  }}
                >
                  <label
                    style={{
                      fontSize: "11px",
                      color: "#aaa",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    Pattern:
                    <select
                      value={bossParams[headerKey][0]}
                      onChange={(e) =>
                        updateBossParam(headerKey, 0, e.target.value)
                      }
                      style={{
                        background: "#111",
                        color: "#fff",
                        border: "1px solid #444",
                        padding: "3px",
                        marginTop: "4px",
                      }}
                    >
                      <option value='50'>USER</option>
                      {[...Array(50)].map((_, i) => (
                        <option key={i} value={i}>
                          Preset {i}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label
                    style={{
                      fontSize: "11px",
                      color: "#aaa",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    Step Num:
                    <select
                      value={bossParams[headerKey][3]}
                      onChange={(e) =>
                        updateBossParam(headerKey, 3, e.target.value)
                      }
                      style={{
                        background: "#111",
                        color: "#fff",
                        border: "1px solid #444",
                        padding: "3px",
                        marginTop: "4px",
                      }}
                    >
                      <option value='0'>8 Steps</option>
                      <option value='1'>12 Steps</option>
                      <option value='2'>16 Steps</option>
                      <option value='3'>24 Steps</option>
                    </select>
                  </label>
                  <label
                    style={{
                      fontSize: "11px",
                      color: "#aaa",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    Effect Type:
                    <select
                      value={bossParams[headerKey][2]}
                      onChange={(e) =>
                        updateBossParam(headerKey, 2, e.target.value)
                      }
                      style={{
                        background: "#111",
                        color: "#fff",
                        border: "1px solid #444",
                        padding: "3px",
                        marginTop: "4px",
                      }}
                    >
                      <option value='0'>OFF</option>
                      <option value='1'>PITCH</option>
                      <option value='2'>FLANGER</option>
                      <option value='3'>PHASER</option>
                      <option value='4'>SWEEP</option>
                      <option value='5'>FILTER</option>
                      <option value='6'>RING</option>
                    </select>
                  </label>
                </div>
              </div>

              <p
                style={{
                  fontSize: "12px",
                  color: "#888",
                  marginTop: 0,
                  marginBottom: "20px",
                  fontStyle: "italic",
                }}
              >
                ⚠︎ <strong>Effect Type</strong> determines which effect will be
                activated and sequenced by the Slicer. Pitch remains independent
                and stackable.
              </p>

              {/* DROPDOWN: ADVANCED CHANNEL FX */}
              <details
                style={{
                  marginBottom: "20px",
                  background: "#222",
                  borderRadius: "6px",
                }}
              >
                <summary
                  style={{
                    padding: "10px 15px",
                    cursor: "pointer",
                    fontSize: "13px",
                    color: "#aaa",
                  }}
                >
                  ▼ Advanced FX Parameters (Phaser, Flanger...)
                </summary>
                <div style={{ padding: "15px" }}>
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#888",
                      marginTop: 0,
                      marginBottom: "15px",
                    }}
                  >
                    These settings determine the "base" behavior of the selected
                    effect (e.g., max Rate and Depth of the Phaser). The Slicer
                    will then apply the effect rhythmically according to the
                    value set on each step.
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(300px, 1fr))",
                      gap: "15px",
                    }}
                  >
                    {renderGenericEffect(
                      `Phaser Ch.${channel}`,
                      `phaser${effectPrefix}`,
                    )}
                    {renderGenericEffect(
                      `Flanger Ch.${channel}`,
                      `flanger${effectPrefix}`,
                    )}
                    {renderGenericEffect(
                      `Tremolo Ch.${channel}`,
                      `tremolo${effectPrefix}`,
                    )}
                    {renderGenericEffect(
                      `Overtone Ch.${channel}`,
                      `overtone${effectPrefix}`,
                    )}
                  </div>
                </div>
              </details>

              {/* params STEPS GRID */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(12, 1fr)",
                  gap: "8px",
                  marginBottom: "20px",
                }}
              >
                {steps.slice(0, stepCount).map((step, i) => {
                  const isActive = step.level > 0;
                  const isPlayingStep = i === currentStep && isPlaying;
                  const isEditing = i === editStepIndex;

                  return (
                    <div
                      key={i}
                      onClick={() => setEditStep(i)}
                      style={{
                        height: "60px",
                        background: isEditing
                          ? "#444"
                          : isActive
                            ? `${color}30`
                            : "#222",
                        border: `2px solid ${isPlayingStep ? "#fff" : isEditing ? color : "#333"}`,
                        borderRadius: "4px",
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "flex-end",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: "2px",
                          left: "4px",
                          fontSize: "10px",
                          color: "#888",
                        }}
                      >
                        {i + 1}
                      </div>
                      {isActive && (
                        <div
                          style={{
                            background: color,
                            height: `${step.level}%`,
                            width: "100%",
                            opacity: 0.8,
                            transition: "height 0.2s",
                          }}
                        ></div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* SELECTED STEP EDITING PANEL */}
              <div
                style={{
                  background: "#222",
                  padding: "15px",
                  borderRadius: "8px",
                  display: "flex",
                  gap: "20px",
                  alignItems: "center",
                  flexWrap: "wrap",
                  borderLeft: `4px solid ${color}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    minWidth: "80px",
                  }}
                >
                  <span style={{ fontSize: "12px", color: "#aaa" }}>Step</span>
                  <span
                    style={{
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: color,
                    }}
                  >
                    {editStepIndex + 1}
                  </span>
                  <button
                    onClick={() => toggleStep(channel, editStepIndex)}
                    style={{
                      marginTop: "5px",
                      padding: "4px 10px",
                      background:
                        steps[editStepIndex].level > 0 ? color : "#555",
                      color: steps[editStepIndex].level > 0 ? "#000" : "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontWeight: "bold",
                      fontSize: "11px",
                    }}
                  >
                    {steps[editStepIndex].level > 0 ? "ON" : "OFF"}
                  </button>
                </div>

                <div
                  style={{
                    flex: 1,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                    gap: "15px",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      fontSize: "12px",
                      color: "#ccc",
                    }}
                  >
                    <span style={{ marginBottom: "5px" }}>
                      Volume: {steps[editStepIndex].level}
                    </span>
                    <input
                      type='range'
                      min='0'
                      max='100'
                      value={steps[editStepIndex].level}
                      onChange={(e) =>
                        updateStep(
                          channel,
                          editStepIndex,
                          "level",
                          e.target.value,
                        )
                      }
                    />
                  </label>
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      fontSize: "12px",
                      color: "#ccc",
                    }}
                  >
                    <span style={{ marginBottom: "5px" }}>
                      Pitch: {steps[editStepIndex].pitch}
                    </span>
                    <input
                      type='range'
                      min='-12'
                      max='12'
                      value={steps[editStepIndex].pitch}
                      onChange={(e) =>
                        updateStep(
                          channel,
                          editStepIndex,
                          "pitch",
                          e.target.value,
                        )
                      }
                    />
                  </label>
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      fontSize: "12px",
                      color: "#ccc",
                    }}
                  >
                    <span style={{ marginBottom: "5px" }}>
                      {dynamicEffectName}: {steps[editStepIndex].filter}
                    </span>
                    <input
                      type='range'
                      min='0'
                      max='100'
                      value={steps[editStepIndex].filter}
                      onChange={(e) =>
                        updateStep(
                          channel,
                          editStepIndex,
                          "filter",
                          e.target.value,
                        )
                      }
                    />
                  </label>
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      fontSize: "12px",
                      color: "#ccc",
                    }}
                  >
                    <span style={{ marginBottom: "5px" }}>
                      Length:{" "}
                      {steps[editStepIndex].length !== undefined
                        ? steps[editStepIndex].length
                        : 50}
                    </span>
                    <input
                      type='range'
                      min='0'
                      max='100'
                      value={
                        steps[editStepIndex].length !== undefined
                          ? steps[editStepIndex].length
                          : 50
                      }
                      onChange={(e) =>
                        updateStep(
                          channel,
                          editStepIndex,
                          "length",
                          e.target.value,
                        )
                      }
                    />
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* FOOTER & LIENS D'AFFILIATION */}
      <div
        style={{
          marginTop: "40px",
          paddingTop: "20px",
          borderTop: "1px solid #333",
          textAlign: "center",
          fontSize: "13px",
          color: "#888",
        }}
      >
        <p style={{ margin: "0 0 10px 0" }}>
          Built with ❤️ for the synth & guitar community. Free and open-source.
        </p>
        <p style={{ margin: 0 }}>
          {/* Need more gear? Support this project by shopping through these
          affiliate links at no extra cost to you: */}
          Thank you BOSS for providing us with quality material, I hope this
          application will be useful and support your work
          <br />
          <a
            href='https://www.boss.info/fr/products/sl-2/'
            target='_blank'
            rel='noopener noreferrer'
            style={{
              color: "#00e5ff",
              textDecoration: "none",
              marginLeft: "8px",
            }}
          >
            BOSS
          </a>
        </p>
      </div>
    </div>
  );
};

export default SlicerApp;
