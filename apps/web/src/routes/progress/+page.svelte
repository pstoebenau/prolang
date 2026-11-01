<script lang="ts">
  import type { PageProps } from './$types';
  import { Button } from '$lib/components/ui/button';
  let { data }: PageProps = $props();
  const deck = $derived(data.deck);
  const history = $derived(data.history);
  const learned = $derived(deck.filter((c) => c.card.reps > 0).length);
  const due = $derived(
    deck.filter((c) => c.card.reps > 0 && new Date(c.card.due) <= new Date())
      .length,
  );
</script>

<svelte:head><title>Progress · Prolang</title></svelte:head>
<div class="eyebrow">Recall & pronunciation</div>
<h1>Your progress</h1>
<div class="stats">
  <div>
    <strong>{learned}<small> / {deck.length}</small></strong><small
      >Reviewed words</small
    >
  </div>
  <div><strong>{due}</strong><small>Due now</small></div>
  <div>
    <strong>{history.attempts.length}</strong><small>Speech attempts</small>
  </div>
</div>
<h2>Recall history</h2>
{#if !history.reviews.length}<p class="muted">
    Your self-graded reviews will appear here.
  </p>{/if}{#each history.reviews.slice(0, 100) as r}<div class="history">
    <strong lang="de">{deck.find((c) => c.id === r.cardId)?.german}</strong>
    · {['', 'Again', 'Hard', 'Good', 'Easy'][r.grade]}
    <p class="muted">{new Date(r.at).toLocaleString()}</p>
  </div>{/each}
<h2>Pronunciation attempts</h2>
{#if !history.attempts.length}<p class="muted">
    Record a phrase to see your feedback history.
  </p>{/if}{#each history.attempts.slice(0, 100) as a}<details class="history">
    <summary
      ><span lang="de">{a.target}</span> · {Number(a.feedback.score).toFixed(0)}
      / {deck.length} · {new Date(a.at).toLocaleString()}</summary
    >
    <p>Heard: {a.feedback.transcribe}</p>
    <pre>{JSON.stringify(a.feedback, null, 2)}</pre>
    <Button variant="outline" href={`/practice?retry=${a.cardId}`}
      >Retry this word</Button
    >
  </details>{/each}
