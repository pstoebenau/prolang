<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import type { PageProps } from './$types';
  import { onDestroy, tick } from 'svelte';
  import { invalidate } from '$app/navigation';
  import { Button } from '$lib/components/ui/button';
  import {
    vocabularyProgress,
    vocabulary,
    type VocabularyMode,
    type VocabularyResult,
  } from '$lib/skills/vocabulary';
  import { stages } from '$lib/skills/passages';
  let { data }: PageProps = $props();
  type Session = {
    id: string;
    mode: VocabularyMode;
    questions: {
      itemId: string;
      prompt: string;
      options: { id: string; label: string }[];
    }[];
  };
  let session = $state<Session | null>(null),
    result = $state<VocabularyResult | null>(null);
  let answers = $state<string[]>([]),
    index = $state(0),
    answer = $state(''),
    busy = $state(false),
    error = $state('');
  let controller: AbortController | undefined,
    generation = 0;
  let questionHeading = $state<HTMLHeadingElement>();
  const question = $derived(session?.questions[index]);
  const modes: VocabularyMode[] = ['recognition', 'recall'];
  const label = (mode: VocabularyMode) =>
    mode === 'recognition' ? 'Recognition' : 'Active recall';
  function cancel() {
    generation++;
    controller?.abort();
    busy = false;
    session = null;
    answer = '';
    error = '';
  }
  async function request(body: unknown) {
    controller = new AbortController();
    const r = await fetch('/api/vocabulary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.message || 'Assessment failed. Try again.');
    return d;
  }
  async function start(mode: VocabularyMode) {
    cancel();
    const op = generation;
    busy = true;
    result = null;
    try {
      const s = await request({ action: 'start', mode });
      if (op === generation) {
        session = s;
        answers = [];
        index = 0;
        await tick();
        questionHeading?.focus();
      }
    } catch (e) {
      if (op === generation)
        error = e instanceof Error ? e.message : 'Could not start.';
    } finally {
      if (op === generation) busy = false;
    }
  }
  async function next(skip = false) {
    if (!session || busy) return;
    answers[index] = skip ? '' : answer.trim();
    answer = '';
    if (index < session.questions.length - 1) {
      index++;
      await tick();
      questionHeading?.focus();
      return;
    }
    await finish();
  }
  async function finish() {
    if (!session) return;
    const op = generation;
    busy = true;
    error = '';
    try {
      const r = await request({ action: 'finish', id: session.id, answers });
      if (op !== generation) return;
      result = r;
      session = null;
      await invalidate('prolang:skills');
    } catch (e) {
      if (op === generation)
        error = e instanceof Error ? e.message : 'Could not save assessment.';
    } finally {
      if (op === generation) busy = false;
    }
  }
  onDestroy(cancel);
</script>

<svelte:head><title>Vocabulary stages · Prolang</title></svelte:head>
<div
  class="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
>
  Two sides of knowing a word
</div>
<h1
  class="mt-2.5 mb-3 text-[34px] font-semibold tracking-[-1.2px] max-[750px]:text-[29px]"
>
  Your vocabulary
</h1>
<p class="leading-[1.6]">
  Recognizing a word and recalling it yourself are different skills. Take a
  short assessment for each to explore vocabulary beyond your flashcard deck.
</p>
<p class="text-sm text-muted-foreground">
  Each assessment samples 16 words from four difficulty bands in a curated
  64-word bank. Stages estimate performance on this sample, not a total word
  count or a certified German level. Repeated tests can reflect familiarity with
  the bank.
</p>
<div
  class="my-7 grid grid-cols-2 gap-10 border-y py-3 max-[650px]:grid-cols-1 max-[650px]:gap-2"
  data-testid="skill-columns"
>
  {#each modes as mode}
    {@const latest = data.history.find((r) => r.mode === mode)}
    {@const progress = vocabularyProgress(latest)}
    <section>
      <h2 class="mt-6 mb-3 text-[22px] font-semibold">{label(mode)}</h2>
      <strong
        >{progress.assessed
          ? stages[progress.level]
          : 'Not assessed yet'}</strong
      >
      <p class="leading-[1.6]">
        {mode === 'recognition'
          ? 'German word → choose its English meaning.'
          : 'English meaning → type the German word.'}
      </p>
      {#if latest}
        <p class="leading-[1.6]">
          {progress.total} / 16 correct · {new Date(
            latest.at,
          ).toLocaleDateString()}
        </p>
        <progress
          class="max-w-full accent-primary"
          value={progress.total}
          max="16"
          aria-label={`${label(mode)} sample accuracy`}
        ></progress>
      {/if}
      <div class="my-[18px] flex flex-wrap items-center gap-2.5">
        <Button disabled={busy || !!session} onclick={() => start(mode)}
          >{latest ? 'Reassess' : 'Find my stage'}</Button
        >
      </div>
    </section>
  {/each}
</div>
{#if session && question}
  <section class="border-b py-6" aria-label="Vocabulary assessment">
    <p
      class="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
    >
      {label(session.mode)} · {index + 1} / {session.questions.length}
    </p>
    <progress
      class="max-w-full accent-primary"
      max={session.questions.length}
      value={index}
      aria-label="Assessment progress"
    ></progress>
    {#if answers.length === 16 && error}
      <p class="leading-[1.6]">
        Your answers are ready. Retry saving, or check your saved results if
        another tab already submitted this assessment.
      </p>
      <Button disabled={busy} onclick={finish}>Retry saving</Button>
    {:else}
      <h2
        class="mt-6 mb-3 font-semibold text-[30px]"
        bind:this={questionHeading}
        tabindex="-1"
        lang={session.mode === 'recognition' ? 'de' : 'en'}
      >
        {question.prompt}
      </h2>
      <form
        onsubmit={(e) => {
          e.preventDefault();
          void next();
        }}
      >
        {#if session.mode === 'recognition'}
          <fieldset class="border-0 p-0" disabled={busy}>
            <legend>Choose the English meaning</legend>
            {#each question.options as option}
              <label
                class="mt-3 mb-1.5 text-sm flex max-w-[480px] items-center gap-3.5 border-b py-2"
                ><input
                  class="accent-primary min-h-6 w-5"
                  type="radio"
                  name="meaning"
                  value={option.id}
                  bind:group={answer}
                />{option.label}</label
              >
            {/each}
          </fieldset>
        {:else}
          <label class="mt-3 mb-1.5 block text-sm" for="german-answer"
            >German word</label
          >
          <Input
            class="w-full max-w-[440px]"
            id="german-answer"
            lang="de"
            bind:value={answer}
            maxlength={200}
            autocomplete="off"
            spellcheck="false"
            disabled={busy}
          />
          <p class="text-sm text-muted-foreground">
            Articles are optional. Capitalization is ignored; umlauts and
            spelling count. Use the word matching this meaning.
          </p>
        {/if}
        <div class="my-[18px] flex flex-wrap items-center gap-2.5">
          <Button type="submit" disabled={busy || !answer.trim()}
            >{index === 15 ? 'Finish assessment' : 'Next'}</Button
          ><Button variant="outline" disabled={busy} onclick={() => next(true)}
            >I do not know</Button
          >
        </div>
      </form>
    {/if}
    <Button variant="ghost" onclick={cancel}>Cancel assessment</Button>
  </section>
{/if}
{#if busy}<p class="leading-[1.6]" role="status">
    Saving / loading assessment…
  </p>{/if}
{#if error}<p
    role="alert"
    class="leading-[1.6] my-[18px] border-l-[3px] border-destructive bg-destructive/12 px-[18px] py-3.5 text-destructive"
  >
    {error}
  </p>{/if}
{#if result}
  {@const progress = vocabularyProgress(result)}
  <section class="border-b py-6" aria-label="Vocabulary result">
    <h2 class="mt-6 mb-3 font-semibold text-[30px]">
      {label(result.mode)} · {stages[progress.level]}
    </h2>
    <p class="leading-[1.6]">
      {progress.total} of 16 correct. This is an estimate from a small sample.
    </p>
    <p class="text-sm text-muted-foreground">
      Each band needs {result.mode === 'recognition'
        ? '4 out of 4'
        : '3 out of 4'} correct to unlock the next stage. Earlier bands must also
      pass. Recognition uses a higher threshold to reduce advancement by guessing.
    </p>
    {#each stages as stage, i}<p class="leading-[1.6]">
        {stage} words: {progress.bands[i]} / 4
      </p>{/each}
    <details>
      <summary class="min-h-11 cursor-pointer py-2.5"
        >Review your answers</summary
      >
      {#each result.answers as a}
        {@const item = vocabulary.find((v) => v.id === a.itemId)!}
        <div class="border-t py-4">
          <strong lang="de">{item.german}</strong> · {item.meaning}
          <p class="leading-[1.6]">
            {a.correct ? 'Correct' : 'Not yet'} · Your answer: {a.answer
              ? result.mode === 'recognition'
                ? vocabulary.find((v) => v.id === a.answer)?.meaning
                : a.answer
              : 'I do not know'}
          </p>
        </div>
      {/each}
    </details>
  </section>
{/if}
<h2 class="mt-6 mb-3 text-[22px] font-semibold">Assessment history</h2>
{#if !data.history.length}<p class="leading-[1.6]">
    Your completed vocabulary assessments will appear here.
  </p>{/if}
{#each data.history as r}
  {@const p = vocabularyProgress(r)}
  <div class="border-t py-4">
    <strong>{label(r.mode)} · {stages[p.level]}</strong>
    <p class="leading-[1.6]">
      {new Date(r.at).toLocaleString()} · {p.total} / 16 correct
    </p>
    <Button
      variant="outline"
      disabled={busy || !!session}
      onclick={() => (result = r)}>Review answers</Button
    >
  </div>
{/each}
<p class="text-sm text-muted-foreground">
  These assessments do not change flashcard due dates or reading-aloud stages.
</p>
