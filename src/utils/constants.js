const stepNumber = [8, 12, 16, 24];

const MAX_STEPS = 24;

const generateEmptyTrack = () =>
  Array.from({ length: MAX_STEPS }, () => ({
    level: 100,
    pitch: 0,
    filter: 50,
    length: 50,
  }));

export { stepNumber, generateEmptyTrack, MAX_STEPS };