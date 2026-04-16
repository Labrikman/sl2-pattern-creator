  export const exportTSL = (bossParams, liveSetName, ch1Steps, ch2Steps) => {
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
              memo: "Exported via SL2PC",
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

    // --- FUNCTION forTSL ---
export  const applyTSLData = (jsonString, setLiveSetName, setCh1Steps, setCh2Steps, setBossParams) => {
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

  