<script lang="ts">
  import RecordingStatus from '$lib/components/practice/RecordingStatus.svelte';
  import { NativeSelect } from '$lib/components/ui/native-select';
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
<div
  class="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
>
  Read, listen, improve
</div>
<h1
  class="mt-2.5 mb-3 text-[34px] font-semibold tracking-[-1.2px] max-[750px]:text-[29px]"
>
  Read aloud
</h1>
<p class="leading-[1.6]">
  Take your time with a German passage. Finish speaking to see the same word and
  sound feedback you use in flashcards.
</p>
<section class="my-7 border-y pt-2 pb-3" aria-label="Reading-aloud level">
  <h2 class="mt-6 mb-3 text-[22px] font-semibold">
    {data.progress.placed
      ? stages[data.progress.level]
      : 'Find your starting stage'}
  </h2>
  {#if data.progress.placed}
    <p class="leading-[1.6]">
      Reading aloud · {data.progress.level === 3
        ? 'Highest current stage. Keep exploring the passages.'
        : `${data.progress.nextStage} more distinct passages scoring 80 or above to advance.`}
    </p>
    <progress
      class="accent-primary w-full max-w-[320px]"
      max="3"
      value={data.progress.level === 3
        ? 3
        : Math.min(3, data.progress.successful)}
      aria-label="Reading stage progress"
    ></progress>
  {:else}
    <p class="leading-[1.6]">
      Read three short placement samples. {data.progress.placementDone} of 3 complete.
      Your pronunciation results suggest your first stage.
    </p>
    <progress
      class="accent-primary w-full max-w-[320px]"
      max="3"
      value={data.progress.placementDone}
      aria-label="Placement progress"
    ></progress>
  {/if}
  <p class="text-sm text-muted-foreground">
    This is your reading-aloud stage, not an overall German or CEFR level.
    Scores are experimental. Three different passages below 55 move the
    automatic stage down; easier or harder practice is always available after
    placement. Only attempts at your current automatic stage affect progression.
  </p>
</section>
{#if data.progress.placed}
  <div class="flex flex-wrap gap-6">
    <label class="mt-3 mb-1.5 block text-sm"
      >Difficulty
      <NativeSelect
        class=" mt-2 block max-w-full"
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
      </NativeSelect>
    </label>
    <label class="mt-3 mb-1.5 block text-sm"
      >Passage
      <NativeSelect
        class=" mt-2 block max-w-full"
        value={session.passageId}
        disabled={session.busy}
        onchange={(e) => session.choose(e.currentTarget.value)}
      >
        <option value="" disabled>Choose a passage</option>
        {#each available as p}<option value={p.id}>{p.title}</option>{/each}
      </NativeSelect>
    </label>
  </div>
{/if}
{#if passage}
  <section>
    <div>
      <p
        class="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
      >
        {passage.placement
          ? 'Placement sample'
          : `${stages[passage.level]} · About 1–2 minutes`}
      </p>
      <h2 class="mt-6 mb-3 text-[22px] font-semibold" lang="de">
        {passage.title}
      </h2>
      <p class="max-w-[72ch] text-[22px] leading-[1.9]" lang="de">
        {passage.text}
      </p>
      <div class="my-[18px] flex flex-wrap items-center gap-2.5">
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
      <RecordingStatus recording={session.recording}>
        {session.recording
          ? `Recording · ${session.seconds}s / 120s. Pauses are fine.`
          : session.busy
            ? 'Processing… Longer passages may take several minutes.'
            : session.referenceLoading
              ? 'Preparing synthetic reference…'
              : 'Recording stops at two minutes. Feedback appears after you finish.'}
      </RecordingStatus>
    </div>
    {#if session.attempt}
      <section class="border-t pt-4" aria-label="Paragraph feedback">
        <h2 class="mt-6 mb-3 text-[22px] font-semibold">
          {session.attempt.feedback.score?.toFixed(0)}
          <small class="text-sm text-muted-foreground"
            >/ 100 · pronunciation</small
          >
        </h2>
        <p class="text-sm text-muted-foreground">
          {new Date(session.attempt.at).toLocaleString()} · Select a word to compare
          its sounds.
        </p>
        <Button
          variant="outline"
          disabled={session.busy}
          onclick={() => session.yours()}>Play your whole recording</Button
        >
        <div class="mt-6">
          <PronunciationFeedback
            feedback={session.attempt.feedback}
            target={session.attempt.target}
            busy={session.busy}
            referenceLoading={session.referenceLoading}
            onreference={session.reference}
            onyours={session.yours}
          />
        </div>
      </section>
    {/if}
  </section>
{/if}
{#if session.error}<p
    class="leading-[1.6] my-[18px] border-l-[3px] border-destructive bg-destructive/12 px-[18px] py-3.5 text-destructive"
    role="alert"
  >
    {session.error}
  </p>{/if}
<h2 class="mt-6 mb-3 text-[22px] font-semibold">Saved readings</h2>
<p class="text-sm text-muted-foreground">
  Reopen any attempt to inspect feedback and listen again. Compare scores on the
  same passage; different passage difficulties are not directly comparable.
</p>
{#if !data.history.length}<p class="leading-[1.6]">
    Your first completed reading will appear here.
  </p>{/if}
{#each data.history as a}
  <div class="border-t py-4 flex flex-wrap items-center justify-between gap-5">
    <div>
      <strong lang="de"
        >{passages.find((p) => p.id === a.passageId)?.title}</strong
      >
      <p class="text-sm text-muted-foreground">
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
