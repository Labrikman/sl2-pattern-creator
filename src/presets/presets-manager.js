  // --- PRESETS MANAGMENT
  const COMMUNITY_PRESETS = [
    { label: "--- Select a Community Preset ---", url: "" },
    { label: "FIRST_PRESET", url: process.env.PUBLIC_URL + "/presets/first_preset.tsl" },
    { label: "pattern-interesting", url: process.env.PUBLIC_URL + "/presets/pattern-interesting.tsl" },
    // add your preset here by uploading a .tsl file to the /public/presets folder and adding an entry in this array with the correct URL (the filename must be lowercase and without spaces for the URL) !
  ];
  export { COMMUNITY_PRESETS };