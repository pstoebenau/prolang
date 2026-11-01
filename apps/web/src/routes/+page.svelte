<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>Prolang · Home</title>
  <meta name="description" content="Build your German vocabulary and practice pronunciation with Prolang." />
</svelte:head>

<section class="home-intro">
  <p class="eyebrow">Your German, a little more fluent</p>
  <h1>Make German part of your day.</h1>
  <p>Recall useful words, say them aloud, and listen closely. A short practice session brings vocabulary and pronunciation together.</p>
  <p class="muted">{data.due} cards due for review · {data.newCards} new cards to explore</p>
  <div class="actions">
    <Button href="/practice">Go to practice</Button>
    <Button variant="outline" href="/deck">Explore your deck</Button>
  </div>
</section>
<section class="home-next" aria-label="Your learning tools">
  <div>
    <h2>Learn, then come back</h2>
    <p>Review up to 20 due cards and 5 new cards per session. Your recall ratings help schedule the next review.</p>
    <a href="/progress">See your progress</a>
  </div>
  <div>
    <h2>Find the sound</h2>
    <p>Compare your recording with native audio, inspect each word, and try practical cues for the sounds that differ.</p>
    <a href="/deck">Choose a word to practice</a>
  </div>
</section>

<style>
  .home-intro { max-width: 680px; padding: 24px 0 40px; }
  h1 { font-size: clamp(34px, 5vw, 52px); line-height: 1.1; }
  .home-next { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; border-top: 1px solid #d3d9cd; padding-top: 12px; }
  @media (max-width: 600px) { .home-next { grid-template-columns: 1fr; gap: 12px; } }
</style>
