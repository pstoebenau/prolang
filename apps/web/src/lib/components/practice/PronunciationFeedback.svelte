<script lang="ts">
  import { Tooltip } from 'bits-ui';
  import PhoneSequence from './PhoneSequence.svelte';
  import type { SpeechFeedback, AudioSegment } from '$lib/types';
  import { practiceWords } from '$lib/practice-feedback';
  import { Button } from '$lib/components/ui/button';
  let {
    feedback,
    target,
    busy,
    referenceLoading,
    onreference,
    onyours,
  }: {
    feedback: SpeechFeedback | null;
    target: string;
    busy: boolean;
    referenceLoading: boolean;
    onreference: (word?: string) => Promise<void>;
    onyours: (segment: AudioSegment) => Promise<void>;
  } = $props();
  function phonemes(value: unknown): string {
    if (Array.isArray(value))
      return value.map(phonemes).filter(Boolean).join(' ');
    return typeof value === 'string' ? value : '';
  }
  let selectedWord = $state(0);
  const wordResults = $derived(practiceWords(target, feedback));
  const selectedResult = $derived(wordResults[selectedWord] ?? wordResults[0]);
  function wordColor(severity: number | null) {
    return severity === null
      ? 'var(--muted-foreground)'
      : severity <= 0.5
        ? `color-mix(in srgb, var(--success), var(--warning) ${severity * 200}%)`
        : `color-mix(in srgb, var(--warning), var(--destructive) ${(severity - 0.5) * 200}%)`;
  }

  $effect(() => {
    feedback;
    selectedWord = 0;
  });
</script>

{#if feedback}
  <div class="mb-6 flex flex-wrap gap-2" aria-label="Words to inspect">
    {#each wordResults as word, i}
      <button
        class="max-w-full cursor-pointer rounded-t-sm border-b-[3px] border-[var(--word-color)] bg-transparent px-2.5 py-2 text-[23px] text-[var(--word-color)] [overflow-wrap:anywhere] transition-colors hover:bg-[color-mix(in_srgb,var(--word-color)_10%,transparent)] aria-pressed:bg-[color-mix(in_srgb,var(--word-color)_10%,transparent)] aria-pressed:outline aria-pressed:outline-[var(--word-color)] aria-pressed:outline-offset-3 disabled:cursor-wait disabled:opacity-60"
        style:--word-color={wordColor(word.severity)}
        aria-pressed={selectedWord === i}
        aria-label={`${word.expected || word.detected}: ${word.label}`}
        disabled={busy}
        onclick={() => {
          selectedWord = i;
        }}
      >
        <span lang="de">{word.expected || `+ ${word.detected}`}</span>
      </button>
    {/each}
  </div>
  {#if wordResults.some((word) => !word.matches)}
    <p class="text-sm text-muted-foreground" data-testid="transcript-note">
      Transcript (may be inaccurate): <span lang="de"
        >{feedback.transcribe || 'No words recognized'}</span
      >
    </p>
  {/if}
  {#if selectedResult}
    <div class="pb-5" data-testid="selected-word" aria-live="polite">
      <div class="flex flex-wrap items-baseline gap-3">
        <h3 class="font-[650] text-xl" lang="de">
          {selectedResult.expected || selectedResult.detected}
        </h3>
        <small
          class="text-sm text-muted-foreground"
          style:color={wordColor(selectedResult.severity)}
          >{selectedResult.label}</small
        >
      </div>
      <Tooltip.Provider delayDuration={200}>
        <dl class="my-5">
          <div
            class="grid grid-cols-[85px_minmax(0,1fr)] items-baseline gap-3 py-2"
          >
            <dt class="text-[13px] text-muted-foreground">Expected</dt>
            <dd
              class="m-0 [overflow-wrap:anywhere]"
              class:font-ipa={!!selectedResult.expectedPhones?.length}
              class:text-[19px]={!!selectedResult.expectedPhones?.length}
            >
              {#if selectedResult.phonePairs}
                <PhoneSequence
                  pairs={selectedResult.phonePairs}
                  side="expected"
                  {busy}
                />
              {:else}
                {phonemes(selectedResult.expectedPhones) ||
                  selectedResult.expected ||
                  '—'}
              {/if}
            </dd>
          </div>
          <div
            class="grid grid-cols-[85px_minmax(0,1fr)] items-baseline gap-3 py-2"
          >
            <dt class="text-[13px] text-muted-foreground">You said</dt>
            <dd
              class="m-0 [overflow-wrap:anywhere]"
              class:font-ipa={!!selectedResult.heardPhones}
              class:text-[19px]={!!selectedResult.heardPhones}
            >
              {#if selectedResult.phonePairs}
                <PhoneSequence
                  pairs={selectedResult.phonePairs}
                  side="heard"
                  {busy}
                />
              {:else}
                {selectedResult.heardPhones !== undefined
                  ? phonemes(selectedResult.heardPhones) || 'Not detected'
                  : 'Sound comparison unavailable'}
              {/if}
            </dd>
          </div>
        </dl>
      </Tooltip.Provider>
      {#if selectedResult.phonePairs}
        <p class="text-muted-foreground mb-3 text-xs">
          Hover, focus, or tap a symbol in either row for tips on the expected
          sound.
        </p>
      {/if}
      <div class="my-[18px] flex flex-wrap items-center gap-2.5">
        {#if selectedResult.expected}
          <Button
            variant="outline"
            disabled={busy || referenceLoading}
            aria-busy={referenceLoading}
            onclick={() => onreference(selectedResult.expected)}>Native</Button
          >
        {/if}
        <Button
          variant="outline"
          disabled={busy || !selectedResult.segment}
          title={selectedResult.segment
            ? 'Play your word'
            : 'Word timing unavailable; record again'}
          onclick={() =>
            selectedResult.segment && onyours(selectedResult.segment)}
          >Yours</Button
        >
      </div>
    </div>
  {/if}
{:else}<p class="text-sm text-muted-foreground">
    Record to compare your pronunciation.
  </p>{/if}
