import type { AudioSegment } from '$lib/types';

const WORD_PADDING_SECONDS = 0.05;

/** AudioBufferSource schedules the end in audio time, without timer overshoot. */
export function createRecordingPlayback() {
  let context: AudioContext | undefined;
  let recording: Blob | undefined;
  let decoded: Promise<AudioBuffer> | undefined;
  let source: AudioBufferSourceNode | undefined;
  let generation = 0;

  function stop() {
    generation++;
    source?.stop();
    source?.disconnect();
    source = undefined;
  }
  return {
    stop,
    setRecording(blob?: Blob) {
      stop();
      recording = blob;
      decoded = undefined;
    },
    async play({ start, end }: AudioSegment) {
      stop();
      const operation = generation;
      if (!recording) throw Error('Record again to hear your pronunciation.');
      context ??= new AudioContext();
      await context.resume();
      if (operation !== generation) return;
      decoded ??= recording
        .arrayBuffer()
        .then((bytes) => context!.decodeAudioData(bytes));
      const buffer = await decoded;
      if (operation !== generation) return;
      const stopAt = Math.min(end, buffer.duration);
      if (
        !Number.isFinite(start) ||
        !Number.isFinite(stopAt) ||
        start < 0 ||
        stopAt <= start
      )
        throw Error('Word timing unavailable. Record again.');
      source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      const paddedStart = Math.max(0, start - WORD_PADDING_SECONDS);
      const paddedEnd = Math.min(
        buffer.duration,
        stopAt + WORD_PADDING_SECONDS,
      );
      source.start(0, paddedStart, paddedEnd - paddedStart);
    },
    dispose() {
      stop();
      recording = undefined;
      decoded = undefined;
      void context?.close();
    },
  };
}
