let audioContext;
try {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
} catch (e) {
  console.error("Web Audio API is not supported in this browser.");
}

export const playAlarm = () => {
  if (!audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
  gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.0001,
    audioContext.currentTime + 1
  );
  oscillator.start();
  setTimeout(() => oscillator.stop(), 1000);
};
