import { onDestroy } from 'svelte';
import { invalidate } from '$app/navigation';
import { createRecordingPlayback } from './recording-playback';
import type { ReadingAttempt } from '$lib/skills/progression';
import type { AudioSegment } from '$lib/types';
export function createReading() {
  let passageId = $state('');
  let attempt = $state<ReadingAttempt | null>(null);
  let busy = $state(false),
    recording = $state(false),
    referenceLoading = $state(false);
  let error = $state(''),
    seconds = $state(0);
  let generation = 0,
    disposed = false;
  let stream: MediaStream | undefined, recorder: MediaRecorder | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let controller: AbortController | undefined;
  let player: HTMLAudioElement | undefined,
    audioUrl = '';
  const playback = createRecordingPlayback();
  const active = (op: number) => !disposed && generation === op;
  function stopAudio() {
    player?.pause();
    player = undefined;
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioUrl = '';
    playback.stop();
  }
  function tracks() {
    clearInterval(timer);
    stream?.getTracks().forEach((t) => t.stop());
    stream = undefined;
  }
  function cancel() {
    generation++;
    controller?.abort();
    controller = undefined;
    if (recorder?.state === 'recording') recorder.stop();
    tracks();
    stopAudio();
    recording = false;
    busy = false;
    referenceLoading = false;
  }
  function choose(id: string) {
    cancel();
    passageId = id;
    attempt = null;
    error = '';
    seconds = 0;
    playback.setRecording();
  }
  async function response(r: Response) {
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      throw Error(d.message || 'Request failed. Try again.');
    }
    return r;
  }
  async function assess(blob: Blob, op: number) {
    if (!active(op)) return;
    busy = true;
    controller = new AbortController();
    try {
      const f = new FormData();
      f.set('passageId', passageId);
      f.set('file', blob, 'reading.webm');
      const r = await response(
        await fetch('/api/reading', {
          method: 'POST',
          body: f,
          signal: controller.signal,
        }),
      );
      const result = await r.json();
      if (!active(op)) return;
      attempt = result;
      playback.setRecording(blob);
      await invalidate('prolang:skills');
    } catch (e) {
      if (active(op))
        error = e instanceof Error ? e.message : 'Assessment failed.';
    } finally {
      if (active(op)) busy = false;
    }
  }
  async function record() {
    cancel();
    const op = generation;
    error = '';
    busy = true;
    attempt = null;
    seconds = 0;
    playback.setRecording();
    try {
      if (
        !window.isSecureContext ||
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === 'undefined'
      )
        throw Error(
          'Recording needs HTTPS or localhost and a browser with microphone support. Try Chrome.',
        );
      const acquired = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      if (!active(op)) {
        acquired.getTracks().forEach((t) => t.stop());
        return;
      }
      stream = acquired;
      const mime = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg',
      ].find((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(
        stream,
        mime ? { mimeType: mime } : undefined,
      );
      recorder = rec;
      const chunks: Blob[] = [];
      let bytes = 0;
      rec.ondataavailable = (e) => {
        if (!active(op)) return;
        bytes += e.data.size;
        chunks.push(e.data);
        if (bytes > 16 * 1024 * 1024) {
          cancel();
          error =
            'Recording exceeded 16 MB. Try again with a shorter recording.';
        }
      };
      rec.onerror = () => {
        if (active(op)) {
          cancel();
          error = 'Recording failed. Check your microphone and retry.';
        }
      };
      rec.onstop = () => {
        if (!active(op)) return;
        tracks();
        recording = false;
        void assess(
          new Blob(chunks, { type: rec.mimeType || 'audio/webm' }),
          op,
        );
      };
      rec.start(250);
      recording = true;
      const started = Date.now();
      timer = setInterval(() => {
        seconds = Math.min(120, Math.floor((Date.now() - started) / 1000));
        if (seconds >= 120 && rec.state === 'recording') rec.stop();
      }, 250);
    } catch (e) {
      if (active(op)) {
        tracks();
        busy = false;
        error = e instanceof Error ? e.message : 'Microphone unavailable.';
      }
    }
  }
  async function open(saved: ReadingAttempt) {
    choose(saved.passageId);
    attempt = saved;
    const op = generation;
    busy = true;
    controller = new AbortController();
    try {
      const r = await response(
        await fetch(`/api/reading/recording?id=${saved.id}`, {
          signal: controller.signal,
        }),
      );
      const blob = await r.blob();
      if (active(op)) playback.setRecording(blob);
    } catch (e) {
      if (active(op))
        error = e instanceof Error ? e.message : 'Recording unavailable.';
    } finally {
      if (active(op)) busy = false;
    }
  }
  async function reference(word?: string) {
    stopAudio();
    const op = generation;
    error = '';
    referenceLoading = true;
    controller?.abort();
    controller = new AbortController();
    const request = controller;
    try {
      const r = await response(
        await fetch('/api/reading/reference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passageId, word }),
          signal: request.signal,
        }),
      );
      const blob = await r.blob();
      if (!active(op) || request.signal.aborted) return;
      audioUrl = URL.createObjectURL(blob);
      player = new Audio(audioUrl);
      await player.play();
    } catch (e) {
      if (active(op) && !request.signal.aborted)
        error = e instanceof Error ? e.message : 'Playback failed.';
    } finally {
      if (active(op) && !request.signal.aborted) referenceLoading = false;
    }
  }
  async function yours(segment: AudioSegment = { start: 0, end: 120 }) {
    controller?.abort();
    referenceLoading = false;
    stopAudio();
    error = '';
    try {
      await playback.play(segment);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Playback failed.';
    }
  }
  onDestroy(() => {
    disposed = true;
    cancel();
    playback.dispose();
  });
  return {
    get passageId() {
      return passageId;
    },
    get attempt() {
      return attempt;
    },
    get busy() {
      return busy;
    },
    get recording() {
      return recording;
    },
    get referenceLoading() {
      return referenceLoading;
    },
    get error() {
      return error;
    },
    get seconds() {
      return seconds;
    },
    choose,
    record,
    cancel,
    reference,
    yours,
    open,
    stop: () => {
      if (recorder?.state === 'recording') recorder.stop();
    },
  };
}
