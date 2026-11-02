<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { enhance } from '$app/forms';
  import { Button } from '$lib/components/ui/button';
  import type { PageProps } from './$types';
  let { form }: PageProps = $props();
</script>

<svelte:head><title>Settings · Prolang</title></svelte:head>
<div class="eyebrow">Local workspace</div>
<h1>Settings & data</h1>
<h2>Backup</h2>
<p>
  Export your FSRS schedule, parameters, alternatives, review history and
  feedback, saved readings, and vocabulary assessments. Recorded and reference
  audio are excluded; reference audio can be generated again.
</p>
<Button variant="outline" href="/api/export" download="">Export JSON backup</Button
>
<form method="POST" enctype="multipart/form-data" use:enhance>
  <label for="backup">Choose a backup to restore</label>
  <Input
    id="backup"
    name="backup"
    type="file"
    accept="application/json,.json"
    required
  />
  <p>
    Restore replaces all current progress, history and recordings. Export your
    current data first.
  </p>
  <label
    ><input type="checkbox" name="confirm" value="REPLACE" required /> I confirm
    that I want to replace my current data.</label
  >
  <Button type="submit" variant="destructive">Replace with backup</Button>
</form>
{#if form?.message}<p role="status">{form.message}</p>{/if}
<h2>Audio & privacy</h2>
<p>
  OpenPronounce runs locally. Microphone recordings are kept in the local SQLite
  database to recheck alternatives. Keep your data directory private. This is a
  single-user app without accounts; expose it only on a trusted network or
  behind access control.
</p>
<p>
  Reference audio is synthetic German speech from Google Translate through gTTS
  2.5.4, cached locally. Uncached text is sent to Google and needs internet. The
  gTTS software is MIT licensed; no independent redistribution license for
  Google's generated audio is claimed. Google service terms apply.
</p>
<h2>Deck & model provenance</h2>
<p>
  The 100 deck entries and examples were authored for Prolang and are dedicated
  to CC0, along with the built-in reading passages and vocabulary assessment
  bank. Nouns include articles and plural forms or usage notes.
</p>
<p>
  <a href="https://github.com/Halleck45/OpenPronounce">OpenPronounce</a> is MIT licensed,
  pinned to 74bc17e. Transcription uses Qwen3-ASR 1.7B (Apache-2.0), pinned in apps/inference/models.lock.json.
  Wav2Vec2 phoneme and acoustic model revisions are in validation/models.lock.json.
  German feedback uses uncalibrated thresholds and cannot reliably diagnose vowel
  duration. Use it to compare recordings, not as a proficiency grade.
</p>
<p>
  Microphones require HTTPS or localhost. Android hardware and NVIDIA CUDA
  remain unverified. Current tested inference device: Mac CPU.
</p>
