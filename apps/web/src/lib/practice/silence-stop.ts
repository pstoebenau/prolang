const SILENCE_MS = 1500;
const MIN_SOUND_MS = 200;
const SOUND_THRESHOLD = 0.01;
const SAMPLE_MS = 50;

/** Wait for sustained sound, then a pause. Initial silence and clicks don't end a take. */
export function createSilenceDetector() {
  let previous: number | undefined;
  let soundMs = 0;
  let silenceMs = 0;
  let heardSound = false;
  return (rms: number, now: number) => {
    // A throttled/background timer is not evidence of continuous silence.
    const elapsed = previous === undefined ? 0 : Math.max(0, now - previous);
    previous = now;
    if (elapsed > SAMPLE_MS * 4) {
      soundMs = 0;
      silenceMs = 0;
      return false;
    }
    if (rms >= SOUND_THRESHOLD) {
      soundMs += elapsed;
      silenceMs = 0;
      if (soundMs >= MIN_SOUND_MS) heardSound = true;
    } else {
      soundMs = 0;
      if (heardSound) silenceMs += elapsed;
    }
    return heardSound && silenceMs >= SILENCE_MS;
  };
}

/** Own only analysis resources; the caller owns the microphone tracks and recorder. */
export function watchRecordingSilence(
  stream: MediaStream,
  onSilence: () => void,
  onUnavailable: () => void,
): () => void {
  let context: AudioContext | undefined;
  let source: MediaStreamAudioSourceNode | undefined;
  let analyser: AnalyserNode | undefined;
  let interval: ReturnType<typeof setInterval> | undefined;
  let stopped = false;
  function stop() {
    if (stopped) return;
    stopped = true;
    clearInterval(interval);
    source?.disconnect();
    analyser?.disconnect();
    void context?.close().catch(() => {});
  }
  function unavailable() {
    if (stopped) return;
    stop();
    onUnavailable();
  }
  try {
    context = new AudioContext();
    source = context.createMediaStreamSource(stream);
    analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    const detect = createSilenceDetector();
    void context
      .resume()
      .then(() => {
        if (stopped) return;
        interval = setInterval(() => {
          if (stopped || context?.state !== 'running') return;
          try {
            analyser!.getFloatTimeDomainData(samples);
            const rms = Math.sqrt(
              samples.reduce((sum, value) => sum + value * value, 0) /
                samples.length,
            );
            if (detect(rms, performance.now())) {
              stop();
              onSilence();
            }
          } catch {
            unavailable();
          }
        }, SAMPLE_MS);
      })
      .catch(unavailable);
  } catch {
    unavailable();
  }
  return stop;
}
