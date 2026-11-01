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
    onsound,
  }: {
    feedback: SpeechFeedback | null;
    target: string;
    busy: boolean;
    referenceLoading: boolean;
    onreference: (word?: string) => Promise<void>;
    onsound: (phone: string) => Promise<void>;
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
      ? '#687066'
      : `hsl(${Math.round((1 - severity) * 130)} 58% 31%)`;
  }

  $effect(() => {
    feedback;
    selectedWord = 0;
  });
</script>

{#if feedback}
  <div class="word-strip" aria-label="Words to inspect">
    {#each wordResults as word, i}
      <button
        class="word-token"
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
    <p class="muted transcript-note">
      Transcript (may be inaccurate): <span lang="de"
        >{feedback.transcribe || 'No words recognized'}</span
      >
    </p>
  {/if}
  {#if selectedResult}
    <div class="selected-word" aria-live="polite">
      <div class="selected-heading">
        <h3 lang="de">{selectedResult.expected || selectedResult.detected}</h3>
        <small style:color={wordColor(selectedResult.severity)}
          >{selectedResult.label}</small
        >
      </div>
      <Tooltip.Provider delayDuration={200}>
        <dl class="sound-pair">
          <div>
            <dt>Expected</dt>
            <dd class:ipa={!!selectedResult.expectedPhones?.length}>
              {#if selectedResult.phonePairs}
                <PhoneSequence
                  pairs={selectedResult.phonePairs}
                  side="expected"
                  {busy}
                  {onsound}
                />
              {:else}
                {phonemes(selectedResult.expectedPhones) ||
                  selectedResult.expected ||
                  '—'}
              {/if}
            </dd>
          </div>
          <div>
            <dt>You said</dt>
            <dd class:ipa={!!selectedResult.heardPhones}>
              {#if selectedResult.phonePairs}
                <PhoneSequence
                  pairs={selectedResult.phonePairs}
                  side="heard"
                  {busy}
                  {onsound}
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
        <p class="muted sound-hint">
          Hover or focus a symbol for tips. Click to hear it. <a href="/sounds"
            >Audio credits</a
          >
        </p>
      {/if}
      <div class="actions">
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
{:else}<p class="muted">Record to compare your pronunciation.</p>{/if}

<style>
  .sound-hint {
    font-size: 12px;
    margin: 0 0 12px;
  }
</style>
