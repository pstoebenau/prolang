<script lang="ts">
  import type { PageProps } from './$types';
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import PronunciationFeedback from '$lib/components/practice/PronunciationFeedback.svelte';
  import { passages, stages } from '$lib/skills/passages';
  import { createReading } from '$lib/practice/reading.svelte';
  let { data }: PageProps = $props();
  const session = createReading();
  let override = $state('auto');
  const level = $derived(
    override === 'auto' ? data.progress.level : Number(override),
  );
  const available = $derived(
    passages.filter((p) => !p.placement && p.level === level),
  );
  const passage = $derived(passages.find((p) => p.id === session.passageId));
  function next() {
    if (!data.progress.placed && data.progress.nextPlacement)
      session.choose(data.progress.nextPlacement);
    else {
      const unseen = available.find(
        (p) => !data.history.some((a) => a.passageId === p.id),
      );
      session.choose(
        unseen?.id ??
          available[
            (available.findIndex((p) => p.id === session.passageId) + 1) %
              available.length
          ].id,
      );
    }
  }
  onMount(next);
</script>

<svelte:head><title>Read aloud · Prolang</title></svelte:head>
<div class="eyebrow">Read, listen, improve</div>
<h1>Read aloud</h1>
<p>
  Take your time with a German passage. Finish speaking to see the same word and
  sound feedback you use in flashcards.
</p>
<section class="reading-level" aria-label="Reading-aloud level">
  <h2>
    {data.progress.placed
      ? stages[data.progress.level]
      : 'Find your starting stage'}
  </h2>
  {#if data.progress.placed}
    <p>
      Reading aloud · {data.progress.level === 3
        ? 'Highest current stage. Keep exploring the passages.'
        : `${data.progress.nextStage} more distinct passages scoring 80 or above to advance.`}
    </p>
    <progress
      max="3"
      value={data.progress.level === 3
        ? 3
        : Math.min(3, data.progress.successful)}
      aria-label="Reading stage progress"
    ></progress>
  {:else}
    <p>
      Read three short placement samples. {data.progress.placementDone} of 3 complete.
      Your pronunciation results suggest your first stage.
    </p>
    <progress
      max="3"
      value={data.progress.placementDone}
      aria-label="Placement progress"
    ></progress>
  {/if}
  <p class="muted">
    This is your reading-aloud stage, not an overall German or CEFR level.
    Scores are experimental. Three different passages below 55 move the
    automatic stage down; easier or harder practice is always available after
    placement. Only attempts at your current automatic stage affect progression.
  </p>
</section>
{#if data.progress.placed}
  <div class="reading-options">
    <label
      >Difficulty
      <select
        bind:value={override}
        disabled={session.busy}
        onchange={() => {
          session.choose(
            passages.find(
              (p) =>
                !p.placement &&
                p.level ===
                  (override === 'auto'
                    ? data.progress.level
                    : Number(override)),
            )!.id,
          );
        }}
      >
        <option value="auto">Automatic · {stages[data.progress.level]}</option>
        {#each stages as stage, i}<option value={String(i)}>{stage}</option
          >{/each}
      </select>
    </label>
    <label
      >Passage
      <select
        value={session.passageId}
        disabled={session.busy}
        onchange={(e) => session.choose(e.currentTarget.value)}
      >
        <option value="" disabled>Choose a passage</option>
        {#each available as p}<option value={p.id}>{p.title}</option>{/each}
      </select>
    </label>
  </div>
{/if}
{#if passage}
  <section class="reading-workspace">
    <div>
      <p class="eyebrow">
        {passage.placement
          ? 'Placement sample'
          : `${stages[passage.level]} · About 1–2 minutes`}
      </p>
      <h2 lang="de">{passage.title}</h2>
      <p class="passage" lang="de">{passage.text}</p>
      <div class="actions">
        {#if session.recording}<Button onclick={session.stop}
            >Finish & score</Button
          >
        {:else}<Button
            disabled={session.busy ||
              (!!passage.placement &&
                data.progress.nextPlacement !== passage.id)}
            onclick={session.record}
            >{session.attempt
              ? 'Read the whole passage again'
              : 'Start recording'}</Button
          >{/if}
        {#if session.busy}<Button variant="outline" onclick={session.cancel}
            >Cancel</Button
          >{/if}
        <Button
          variant="outline"
          disabled={session.busy || session.referenceLoading}
          onclick={() => session.reference()}>Listen to passage</Button
        >
        <Button
          variant="ghost"
          disabled={session.busy ||
            (!!passage.placement && data.progress.nextPlacement === passage.id)}
          onclick={next}
          >{passage.placement
            ? data.progress.placed
              ? 'Start paragraph practice'
              : 'Next placement sample'
            : 'Next passage'}</Button
        >
      </div>
      <p class="status" role="status" class:recording={session.recording}>
        {session.recording
          ? `Recording · ${session.seconds}s / 120s. Pauses are fine.`
          : session.busy
            ? 'Processing… Longer passages may take several minutes.'
            : session.referenceLoading
              ? 'Preparing synthetic reference…'
              : 'Recording stops at two minutes. Feedback appears after you finish.'}
      </p>
    </div>
    {#if session.attempt}
      <section class="reading-feedback" aria-label="Paragraph feedback">
        <h2>
          {session.attempt.feedback.score?.toFixed(0)}
          <small>/ 100 · pronunciation</small>
        </h2>
        <p class="muted">
          {new Date(session.attempt.at).toLocaleString()} · Select a word to compare
          its sounds.
        </p>
        <Button
          variant="outline"
          disabled={session.busy}
          onclick={() => session.yours()}>Play your whole recording</Button
        >
        <PronunciationFeedback
          feedback={session.attempt.feedback}
          target={session.attempt.target}
          busy={session.busy}
          referenceLoading={session.referenceLoading}
          onreference={session.reference}
          onyours={session.yours}
        />
      </section>
    {/if}
  </section>
{/if}
{#if session.error}<p class="error" role="alert">{session.error}</p>{/if}
<h2>Saved readings</h2>
<p class="muted">
  Reopen any attempt to inspect feedback and listen again. Compare scores on the
  same passage; different passage difficulties are not directly comparable.
</p>
{#if !data.history.length}<p>
    Your first completed reading will appear here.
  </p>{/if}
{#each data.history as a}
  <div class="history reading-history">
    <div>
      <strong lang="de"
        >{passages.find((p) => p.id === a.passageId)?.title}</strong
      >
      <p class="muted">
        {new Date(a.at).toLocaleString()} · {stages[a.level]}{a.placement
          ? ' · placement'
          : ''}
      </p>
    </div>
    <strong>{a.feedback.score?.toFixed(0)} / 100</strong>
    <Button
      variant="outline"
      disabled={session.busy}
      onclick={() => session.open(a)}>Review recording</Button
    >
  </div>
{/each}

<style>
  .reading-level {
    border-block: 1px solid var(--border);
    padding: 8px 0 12px;
    margin: 28px 0;
  }
  progress {
    accent-color: var(--primary);
    width: min(100%, 320px);
  }
  .reading-options {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
  }
  select {
    display: block;
    max-width: 100%;
    margin-top: 8px;
  }
  .passage {
    font-size: 22px;
    line-height: 1.9;
    max-width: 72ch;
  }
  .reading-feedback {
    border-top: 1px solid var(--border);
    padding-top: 16px;
  }
  .reading-feedback :global(.word-strip) {
    margin-top: 24px;
  }
  .reading-history {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    flex-wrap: wrap;
  }
</style>
