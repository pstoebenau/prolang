<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>Prolang · Home</title>
  <meta
    name="description"
    content="Build your German vocabulary and practice pronunciation with Prolang."
  />
</svelte:head>

<section class="max-w-[680px] pt-6 pb-10">
  <p
    class="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
  >
    Your German, a little more fluent
  </p>
  <h1
    class="mt-2.5 mb-3 font-semibold tracking-[-1.2px] text-[clamp(34px,5vw,52px)] leading-[1.1] max-[750px]:text-[clamp(34px,5vw,52px)]"
  >
    Make German part of your day.
  </h1>
  <p class="leading-[1.6]">
    Recall useful words, say them aloud, and listen closely. A short practice
    session brings vocabulary and pronunciation together.
  </p>
  <p class="text-sm text-muted-foreground">
    {data.due} cards due for review · {data.newCards} new cards to explore
  </p>
  <div class="my-[18px] flex flex-wrap items-center gap-2.5">
    <Button href="/practice">Go to practice</Button>
    <Button variant="outline" href="/reading">Read a paragraph</Button>
    <Button variant="ghost" href="/vocabulary"
      >Find your vocabulary stages</Button
    >
  </div>
</section>
<section
  class="grid grid-cols-2 gap-10 border-t pt-3 max-[600px]:grid-cols-1 max-[600px]:gap-3"
  aria-label="Your learning tools"
>
  <div>
    <h2 class="mt-6 mb-3 text-[22px] font-semibold">Learn, then come back</h2>
    <p class="leading-[1.6]">
      Review up to 20 due cards and 5 new cards per session. Your recall ratings
      help schedule the next review.
    </p>
    <a class="text-primary underline" href="/progress">See your progress</a>
  </div>
  <div>
    <h2 class="mt-6 mb-3 text-[22px] font-semibold">Find the sound</h2>
    <p class="leading-[1.6]">
      Compare your recording with native audio, inspect each word, and try
      practical cues for the sounds that differ.
    </p>
    <a class="text-primary underline" href="/deck">Choose a word to practice</a>
  </div>
</section>
