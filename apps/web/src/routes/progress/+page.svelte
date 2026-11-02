<script lang="ts">
  import { readingProgress } from '$lib/skills/progression';
  import { vocabularyProgress } from '$lib/skills/vocabulary';
  import { stages } from '$lib/skills/passages';
  import type { PageProps } from './$types';
  import { Button } from '$lib/components/ui/button';
  let { data }: PageProps = $props();
  const reading = $derived(readingProgress(data.reading));
  const deck = $derived(data.deck);
  const history = $derived(data.history);
  const learned = $derived(deck.filter((c) => c.card.reps > 0).length);
  const due = $derived(
    deck.filter((c) => c.card.reps > 0 && new Date(c.card.due) <= new Date())
      .length,
  );
</script>

<svelte:head><title>Progress · Prolang</title></svelte:head>
<div
  class="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
>
  Recall & pronunciation
</div>
<h1
  class="mt-2.5 mb-3 text-[34px] font-semibold tracking-[-1.2px] max-[750px]:text-[29px]"
>
  Your progress
</h1>
<div
  class="flex gap-[70px] border-b py-[26px] max-[750px]:gap-[30px]"
  data-testid="stats"
>
  <div>
    <strong class="block text-[38px] tracking-[-1px] max-[750px]:text-[30px]"
      >{learned}<small class="text-sm text-muted-foreground">
        / {deck.length}</small
      ></strong
    ><small class="text-sm text-muted-foreground">Reviewed words</small>
  </div>
  <div>
    <strong class="block text-[38px] tracking-[-1px] max-[750px]:text-[30px]"
      >{due}</strong
    ><small class="text-sm text-muted-foreground">Due now</small>
  </div>
  <div>
    <strong class="block text-[38px] tracking-[-1px] max-[750px]:text-[30px]"
      >{history.attempts.length}</strong
    ><small class="text-sm text-muted-foreground">Speech attempts</small>
  </div>
</div>
<h2 class="mt-6 mb-3 text-[22px] font-semibold">Your skill stages</h2>
<p class="text-sm text-muted-foreground">
  Independent estimates of reading aloud, word recognition, and active recall.
  These are practice stages, not an overall German proficiency grade.
</p>
<div class="border-t py-4">
  <strong
    >Reading aloud · {reading.placed
      ? stages[reading.level]
      : 'Not placed yet'}</strong
  >
  <p class="leading-[1.6]">{data.reading.length} saved readings</p>
  <Button variant="outline" href="/reading">Practice reading aloud</Button>
</div>
{#each ['recognition', 'recall'] as mode}
  {@const result = data.vocabulary.find((r) => r.mode === mode)}
  {@const skill = vocabularyProgress(result)}
  <div class="border-t py-4">
    <strong
      >Vocabulary {mode === 'recognition' ? 'recognition' : 'active recall'} · {skill.assessed
        ? stages[skill.level]
        : 'Not assessed yet'}</strong
    >
    <p class="leading-[1.6]">
      {result
        ? `${skill.total} / 16 on the latest sample`
        : 'Take a short placement assessment.'}
    </p>
    <Button variant="outline" href="/vocabulary">Assess vocabulary</Button>
  </div>
{/each}
<h2 class="mt-6 mb-3 text-[22px] font-semibold">Recall history</h2>
{#if !history.reviews.length}<p class="text-sm text-muted-foreground">
    Your self-graded reviews will appear here.
  </p>{/if}{#each history.reviews.slice(0, 100) as r}<div class="border-t py-4">
    <strong lang="de">{deck.find((c) => c.id === r.cardId)?.german}</strong>
    · {['', 'Again', 'Hard', 'Good', 'Easy'][r.grade]}
    <p class="text-sm text-muted-foreground">
      {new Date(r.at).toLocaleString()}
    </p>
  </div>{/each}
<h2 class="mt-6 mb-3 text-[22px] font-semibold">Pronunciation attempts</h2>
{#if !history.attempts.length}<p class="text-sm text-muted-foreground">
    Record a phrase to see your feedback history.
  </p>{/if}{#each history.attempts.slice(0, 100) as a}<details
    class="border-t py-4"
  >
    <summary class="min-h-11 cursor-pointer py-2.5"
      ><span lang="de">{a.target}</span> · {Number(a.feedback.score).toFixed(0)}
      / {deck.length} · {new Date(a.at).toLocaleString()}</summary
    >
    <p class="leading-[1.6]">Heard: {a.feedback.transcribe}</p>
    <pre
      class="whitespace-pre-wrap text-xs [overflow-wrap:anywhere]">{JSON.stringify(
        a.feedback,
        null,
        2,
      )}</pre>
    <Button variant="outline" href={`/practice?retry=${a.cardId}`}
      >Retry this word</Button
    >
  </details>{/each}
