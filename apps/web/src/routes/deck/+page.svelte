<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import type { PageProps } from './$types';
  import { Button } from '$lib/components/ui/button';
  let { data }: PageProps = $props();
  const deck = $derived(data.deck);
  let search = $state('');
  let category = $state('all');
  const filtered = $derived(
    deck.filter(
      (c) =>
        (category === 'all' || c.category === category) &&
        `${c.german} ${c.english} ${c.example}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    ),
  );
</script>

<svelte:head><title>Deck · Prolang</title></svelte:head>
<div class="eyebrow">100 useful words & phrases</div>
<h1>Your German deck</h1>
<div class="actions">
  <Input
    aria-label="Search deck"
    type="search"
    placeholder="Search German or English…"
    bind:value={search}
  /><select aria-label="Category" bind:value={category}
    ><option value="all">All categories</option
    >{#each ['family', 'daily', 'food', 'shopping', 'travel'] as c}<option
        value={c}>{c}</option
      >{/each}</select
  >
</div>
<p class="muted">
  {filtered.length} entries · pronunciation retries never change recall scheduling
</p>
{#each filtered as c}<div class="deck-row">
    <div>
      <h3 lang="de">{c.german}</h3>
      <p>{c.english}</p>
      <small>{c.category}{c.plural ? ` · ${c.plural}` : ''}</small>
    </div>
    <div class="example">
      <p lang="de">{c.example}</p>
      <small>{c.exampleEnglish}</small>
    </div>
    <Button variant="outline" href={`/practice?retry=${c.id}`}>Practice</Button>
  </div>{/each}{#if !filtered.length}<p>No entries match your search.</p>{/if}
