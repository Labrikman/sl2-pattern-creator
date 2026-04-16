import { useEffect } from "react";

const useMidiKeyboard = (kbdOctave, setSynthConfig) => {
  useEffect(() => {
    // Key management for live pitch control 
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const keyMap = {
        'a': 0, 'q': 0,   // C
        'w': 1, 'z': 1,   // C#
        's': 2,           // D
        'e': 3,           // D#
        'd': 4,           // E
        'f': 5,           // F
        't': 6,           // F#
        'g': 7,           // G
        'y': 8,           // G#
        'h': 9,           // A
        'u': 10,          // A#
        'j': 11,          // B
        'k': 12           // C (+1 octave)
      };

      const noteIndex = keyMap[e.key.toLowerCase()];
      if (noteIndex !== undefined) {
        const targetPitch = (kbdOctave * 12) + noteIndex;
        setSynthConfig(p => ({ ...p, pitch: targetPitch }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // MIDI CONTROLERS
    let midiAccess = null;

    const onMIDIMessage = (message) => {
      const command = message.data[0];
      const note = message.data[1];
      const velocity = message.data[2];

      if (command >= 144 && command <= 159 && velocity > 0) {
        const targetPitch = note - 60;
        setSynthConfig(p => ({ ...p, pitch: targetPitch }));
      }
    };

    const initMIDI = async () => {
      if (navigator.requestMIDIAccess) {
        try {
          midiAccess = await navigator.requestMIDIAccess();
          for (let input of midiAccess.inputs.values()) {
            input.onmidimessage = onMIDIMessage;
          }
          midiAccess.onstatechange = (e) => {
            if (e.port.type === "input" && e.port.state === "connected") {
              e.port.onmidimessage = onMIDIMessage;
            }
          };
        } catch (err) {
          console.warn("MIDI access refused or not supported", err);
        }
      }
    };

    initMIDI();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (midiAccess) {
        for (let input of midiAccess.inputs.values()) {
          input.onmidimessage = null;
        }
      }
    };
  }, [kbdOctave, setSynthConfig]);
};

export default useMidiKeyboard;