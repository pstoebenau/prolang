<script lang="ts">
  import { phoneAudio } from '$lib/phone-audio';
  import { phoneGuidance } from '$lib/phone-guidance';
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
      <dl class="sound-pair">
        <div>
          <dt>Expected</dt>
          <dd class:ipa={!!selectedResult.expectedPhones?.length}>
            {#if selectedResult.phonePairs}
              <PhoneSequence
                pairs={selectedResult.phonePairs}
                side="expected"
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
              <PhoneSequence pairs={selectedResult.phonePairs} side="heard" />
            {:else}
              {selectedResult.heardPhones !== undefined
                ? phonemes(selectedResult.heardPhones) || 'Not detected'
                : 'Sound comparison unavailable'}
            {/if}
          </dd>
        </div>
      </dl>
      {#if selectedResult.phoneDifferences.length}
        <section class="sound-guidance" aria-label="How to improve these sounds">
          <h4>How to shape the sounds</h4>
          <p class="muted">Listen, try the mouth position, then say the whole word.</p>
          <ul>
            {#each selectedResult.phoneDifferences as difference}
              {@const guidance = phoneGuidance(difference)}
              {#if guidance}
                {@const sound = guidance.expected || guidance.heard}
                <li>
                  <div class="sound-heading">
                    <strong class="sound-label">{guidance.label}</strong>
                    {#if phoneAudio(sound)}
                      <Button variant="outline" size="sm" disabled={busy}
                        aria-label={`Listen to sound ${sound}`}
                        onclick={() => onsound(sound)}>Listen to sound</Button>
                    {:else if selectedResult.expected}
                      <Button variant="outline" size="sm" disabled={busy || referenceLoading}
                        onclick={() => onreference(selectedResult.expected)}>Hear in word</Button>
                    {/if}
                  </div>
                  <p>{guidance.instruction}</p>
                </li>
              {/if}
            {/each}
          </ul>
          <p class="muted sound-note">Sound examples demonstrate mouth position; some consonants include surrounding vowels. Use Native for German rhythm and vowel length. <a href="/sounds">Recording credits</a></p>
        </section>
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
  .sound-guidance { border-top: 1px solid #d3d9cd; padding-top: 16px; }
  .sound-heading { display: flex; align-items: center; gap: 12px; }
  .sound-label { font-size: 20px; }
  h4 { font-weight: 650; }
  ul { padding-left: 20px; }
  li { margin: 16px 0; }
  li p { margin: 6px 0; }
</style>
