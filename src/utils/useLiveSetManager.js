import { useState } from "react";
import { exportTSL } from "../utils/tlsManager";


const useLiveSetManager = (liveSetName) => {
  const [liveSetPatches, setLiveSetPatches] = useState([]);

  const addToLiveSet = (bossParams, ch1Steps, ch2Steps) => {
    const newPatch = {
      bossParams: JSON.parse(JSON.stringify(bossParams)),
      ch1Steps: JSON.parse(JSON.stringify(ch1Steps)),
      ch2Steps: JSON.parse(JSON.stringify(ch2Steps)),
    };
    setLiveSetPatches((prev) => [...prev, newPatch]);
  };

  const updatePatch = (index, bossParams, ch1Steps, ch2Steps) => {
    setLiveSetPatches((prev) => {
      const updatedPatches = [...prev];
      updatedPatches[index] = {
        bossParams: JSON.parse(JSON.stringify(bossParams)),
        ch1Steps: JSON.parse(JSON.stringify(ch1Steps)),
        ch2Steps: JSON.parse(JSON.stringify(ch2Steps)),
      };
      return updatedPatches;
    });
  };

  const removePatch = (index) => {
    setLiveSetPatches((prev) => prev.filter((_, i) => i !== index));
  };

  const clearLiveSet = () => {
    if (window.confirm("Do you really want to clear the live set? This action cannot be undone.")) {
      setLiveSetPatches([]);
    }
  };

  const exportLiveSet = (currentBossParams, currentCh1Steps, currentCh2Steps) => {
    if (liveSetPatches.length > 0) {
      exportTSL(liveSetName, liveSetPatches);
    } else {
      exportTSL(liveSetName, [{ bossParams: currentBossParams, ch1Steps: currentCh1Steps, ch2Steps: currentCh2Steps }]);
    }
  };

  return {
    liveSetPatches,
    addToLiveSet,
    updatePatch,
    removePatch,
    clearLiveSet,
    exportLiveSet,
  };
};

export default useLiveSetManager;