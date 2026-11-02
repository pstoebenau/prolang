import { watchRecordingSilence } from './silence-stop';
import { createRecordingPlayback } from './recording-playback';
import { onMount, onDestroy, tick } from 'svelte';
import { invalidate } from '$app/navigation';
import type {
  DeckEntry,
  Ticket,
  SpeechFeedback,
  AudioSegment,
} from '$lib/types';
// Call during component initialization: state and browser resources belong to this instance.
export function createPracticeSession(
  getDeck: () => DeckEntry[],
  getRetry: () => string | null,
) {
  let queue = $state<Ticket[]>([]),
    index = $state(0),
    answer = $state<DeckEntry | null>(null),
    feedback = $state<SpeechFeedback | null>(null),
    attempt = $state(''),
    target = $state(''),
    assessedTarget = $state(''),
    error = $state(''),
    status = $state(''),
    busy = $state(false),
    recording = $state(false),
    finished = $state(false),
    referenceUrl = $state(''),
    referenceLoading = $state(false);
  let referenceController: AbortController | undefined;
  function stopReference() {
    referenceController?.abort();
    referenceController = undefined;
    referenceLoading = false;
    player?.pause();
  }
  const ownPlayback = createRecordingPlayback();
  let stopSilenceMonitor: (() => void) | undefined;
  let recorder: MediaRecorder | undefined,
    stream: MediaStream | undefined,
    timer: ReturnType<typeof setTimeout> | undefined,
    controller: AbortController | undefined,
    disposed = false,
    cancelled = false,
    generation = 0;
  function assertActive(operation: number) {
    if (disposed || operation !== generation)
      throw new DOMException('Practice changed', 'AbortError');
  }
  let player = $state<HTMLAudioElement>();
  const current = $derived(queue[index]);
  const due = $derived(
    getDeck().filter(
      (c) => c.card.reps > 0 && new Date(c.card.due) <= new Date(),
    ).length,
  );
  const learned = $derived(getDeck().filter((c) => c.card.reps > 0).length);
  async function api<T>(path: string, body?: unknown) {
    const operation = generation;
    const r = await fetch('/api/' + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller?.signal,
    });
    const result = await r.json().catch(() => ({}));
    assertActive(operation);
    if (!r.ok)
      throw Error(result.message || 'Request failed. Please try again.');
    return result as T;
  }
  async function refresh() {
    await invalidate('prolang:data');
  }
  function tracks() {
    stopSilenceMonitor?.();
    stopSilenceMonitor = undefined;
    clearTimeout(timer);
    stream?.getTracks().forEach((t) => t.stop());
    stream = undefined;
  }
  function reset() {
    generation++;
    cancelled = true;
    if (recorder?.state === 'recording') recorder.stop();
    tracks();
    controller?.abort();
    controller = undefined;
    stopReference();
    if (referenceUrl) URL.revokeObjectURL(referenceUrl);
    referenceUrl = '';
    ownPlayback.setRecording();
    answer = null;
    feedback = null;
    attempt = '';
    target = '';
    assessedTarget = '';
    error = '';
    status = '';
    recording = false;
    busy = false;
  }
  async function guard(fn: () => Promise<void>) {
    const operation = generation;
    error = '';
    try {
      await fn();
    } catch (e: unknown) {
      if (
        operation === generation &&
        !disposed &&
        !(e instanceof DOMException && e.name === 'AbortError')
      )
        error = e instanceof Error ? e.message : 'Request failed.';
    } finally {
      if (operation === generation && !disposed) busy = false;
    }
  }
  async function start(mode: 'review' | 'retry' = 'review', id?: number) {
    reset();
    busy = true;
    finished = false;
    queue = [];
    index = 0;
    await guard(async () => {
      queue = await api<Ticket[]>('session', { mode, id });
      index = 0;
      if (!queue.length) finished = true;
    });
  }
  async function reveal() {
    busy = true;
    await guard(async () => {
      answer = await api<DeckEntry>('reveal', { ticket: current.ticket });
      target = answer.german;
    });
  }
  async function assess(blob?: Blob) {
    ownPlayback.stop();
    stopReference();
    const operation = generation;
    busy = true;
    status = 'Processing your recording…';
    controller = new AbortController();
    await guard(async () => {
      const f = new FormData();
      f.set('ticket', current.ticket);
      if (blob) f.set('file', blob, 'recording.webm');
      else {
        f.set('attempt', attempt);
        f.set('target', target);
      }
      const r = await fetch('/api/assess', {
        method: 'POST',
        body: f,
        signal: controller?.signal,
      });
      const d = await r.json();
      assertActive(operation);
      if (!r.ok)
        throw Error(d.message || 'Assessment failed. Please try again.');
      answer = d.card;
      feedback = d.feedback;
      attempt = d.id;
      target = d.target;
      assessedTarget = d.target;
      status = '';
      await refresh();
    });
    if (operation === generation && !answer)
      status = 'Record again or reveal the answer to continue.';
  }
  async function record() {
    const operation = generation;
    error = '';
    stopReference();
    ownPlayback.stop();
    if (!window.isSecureContext) {
      error = 'Microphone access needs HTTPS, or localhost on this computer.';
      return;
    }
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      error =
        'Recording is unavailable in this browser. Use current Chrome, or reveal and self-grade.';
      return;
    }
    cancelled = false;
    feedback = null;
    busy = true;
    try {
      const acquired = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      if (operation !== generation || cancelled || disposed) {
        acquired.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = acquired;
      const mime = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg',
      ].find((t) => MediaRecorder.isTypeSupported(t));
      const activeRecorder = new MediaRecorder(
        stream,
        mime ? { mimeType: mime } : undefined,
      );
      recorder = activeRecorder;
      const chunks: Blob[] = [];
      activeRecorder.ondataavailable = (e) => {
        if (operation !== generation || disposed) return;
        if (e.data.size) chunks.push(e.data);
        if (chunks.reduce((s, c) => s + c.size, 0) > 8 * 1024 * 1024) {
          cancelled = true;
          if (activeRecorder.state === 'recording') activeRecorder.stop();
          error = 'Recording exceeded 8 MB. Try a shorter recording.';
        }
      };
      activeRecorder.onerror = () => {
        if (operation !== generation || disposed) return;
        cancelled = true;
        tracks();
        recording = false;
        busy = false;
        error = 'The microphone stopped unexpectedly. Check access and retry.';
      };
      activeRecorder.onstop = () => {
        if (operation !== generation || disposed) return;
        tracks();
        recording = false;
        busy = false;
        if (cancelled || disposed) return;
        const blob = new Blob(chunks, {
          type: activeRecorder.mimeType || 'audio/webm',
        });
        ownPlayback.setRecording(blob);
        void assess(blob);
      };
      activeRecorder.start(250);
      recording = true;
      status = 'Recording · stops after 1.5 seconds of silence';
      stopSilenceMonitor = watchRecordingSilence(
        acquired,
        () => {
          if (
            operation === generation &&
            !disposed &&
            activeRecorder.state === 'recording'
          )
            activeRecorder.stop();
        },
        () => {
          if (
            operation === generation &&
            !disposed &&
            activeRecorder.state === 'recording'
          )
            status =
              'Recording · use Stop & check when finished · maximum 30 seconds';
        },
      );
      timer = setTimeout(
        () => activeRecorder.state === 'recording' && activeRecorder.stop(),
        30000,
      );
    } catch (e: unknown) {
      if (operation !== generation || disposed) return;
      tracks();
      busy = false;
      const name = e instanceof Error ? e.name : '';
      error =
        name === 'NotAllowedError'
          ? 'Microphone permission denied. Allow microphone access in your browser site settings, then retry.'
          : name === 'NotFoundError'
            ? 'No microphone found. Connect one and retry.'
            : name === 'NotReadableError'
              ? 'Microphone is in use or unavailable. Close other recording apps and retry.'
              : 'Could not start recording. Check your microphone and browser.';
    } finally {
      if (operation === generation && !disposed && !recording) busy = false;
    }
  }
  function cancel() {
    ownPlayback.stop();
    stopReference();
    generation++;
    cancelled = true;
    recorder?.state === 'recording' && recorder.stop();
    tracks();
    controller?.abort();
    controller = undefined;
    recording = false;
    busy = false;
    status = 'Cancelled. Your review has not been graded.';
  }
  async function yours(segment: AudioSegment) {
    const operation = generation;
    error = '';
    stopReference();
    try {
      await ownPlayback.play(segment);
    } catch (cause) {
      if (operation === generation && !disposed)
        error =
          cause instanceof Error ? cause.message : 'Recording playback failed.';
    }
  }
  async function reference(word?: string) {
    ownPlayback.stop();
    stopReference();
    const operation = generation;
    const request = new AbortController();
    referenceController = request;
    referenceLoading = true;
    error = '';
    try {
      const r = await fetch('/api/reference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket: current.ticket,
          ...(word ? { word } : {}),
        }),
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(180000)]),
      });
      if (!r.ok) {
        const d = await r.json();
        throw Error(
          d.message ||
            'Reference unavailable. Check your internet connection and retry.',
        );
      }
      const audio = await r.blob();
      assertActive(operation);
      if (request.signal.aborted) return;
      if (referenceUrl.startsWith('blob:')) URL.revokeObjectURL(referenceUrl);
      referenceUrl = URL.createObjectURL(audio);
      await tick();
      assertActive(operation);
      if (request.signal.aborted) return;
      if (player) {
        player.currentTime = 0;
        await player.play();
      }
    } catch (cause) {
      if (operation === generation && !disposed && !request.signal.aborted)
        error =
          cause instanceof Error
            ? cause.message
            : 'Reference playback failed. Try again.';
    } finally {
      if (referenceController === request) {
        referenceLoading = false;
        referenceController = undefined;
      }
    }
  }
  async function grade(value: number) {
    stopReference();
    busy = true;
    await guard(async () => {
      await api('review', { ticket: current.ticket, grade: value });
      reset();
      index++;
      if (index >= queue.length) finished = true;
      await refresh();
    });
  }
  function begin() {
    const retry = getRetry();
    return retry && /^[1-9]\d*$/.test(retry) && Number(retry) <= 100
      ? start('retry', Number(retry))
      : start();
  }
  onMount(() => {
    void begin();
  });
  onDestroy(() => {
    disposed = true;
    reset();
    ownPlayback.dispose();
  });

  return {
    get queue() {
      return queue;
    },
    get index() {
      return index;
    },
    get answer() {
      return answer;
    },
    get feedback() {
      return feedback;
    },
    get attempt() {
      return attempt;
    },
    get target() {
      return target;
    },
    get assessedTarget() {
      return assessedTarget;
    },
    get error() {
      return error;
    },
    get status() {
      return status;
    },
    get busy() {
      return busy;
    },
    get recording() {
      return recording;
    },
    get finished() {
      return finished;
    },
    get referenceLoading() {
      return referenceLoading;
    },
    get referenceUrl() {
      return referenceUrl;
    },
    get player() {
      return player;
    },
    get current() {
      return current;
    },
    get due() {
      return due;
    },
    get learned() {
      return learned;
    },
    set player(value: HTMLAudioElement | undefined) {
      player = value;
    },
    set target(value: string) {
      target = value;
    },
    set error(value: string) {
      error = value;
    },
    start,
    begin,
    reveal,
    assess,
    record,
    cancel,
    reference,
    yours,
    grade,
    stopRecording: () => recorder?.stop(),
  };
}
