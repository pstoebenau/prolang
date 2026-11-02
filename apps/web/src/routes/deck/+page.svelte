<script lang="ts">
  import { NativeSelect } from '$lib/components/ui/native-select';
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
<div
  class="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground"
>
  100 useful words & phrases
</div>
<h1
  class="mt-2.5 mb-3 text-[34px] font-semibold tracking-[-1.2px] max-[750px]:text-[29px]"
>
  Your German deck
</h1>
<div class="my-[18px] flex flex-wrap items-center gap-2.5">
  <Input
    class="min-w-40 flex-1"
    aria-label="Search deck"
    type="search"
    placeholder="Search German or English…"
    bind:value={search}
  /><NativeSelect aria-label="Category" bind:value={category}
    ><option value="all">All categories</option
    >{#each ['family', 'daily', 'food', 'shopping', 'travel'] as c}<option
        value={c}>{c}</option
      >{/each}</NativeSelect
  >
</div>
<p class="text-sm text-muted-foreground">
  {filtered.length} entries · pronunciation retries never change recall scheduling
</p>
{#each filtered as c}<div
    class="grid grid-cols-[1fr_1fr_auto] items-center gap-5 border-t py-[19px] max-[750px]:grid-cols-[1fr_auto]"
    data-testid="deck-row"
  >
    <div>
      <h3 class="text-[17px] font-[650]" lang="de">{c.german}</h3>
      <p class="leading-[1.6] my-1">{c.english}</p>
      <small class="text-sm text-muted-foreground"
        >{c.category}{c.plural ? ` · ${c.plural}` : ''}</small
      >
    </div>
    <div class="max-[750px]:col-span-full max-[750px]:row-start-2">
      <p class="leading-[1.6] my-1" lang="de">{c.example}</p>
      <small class="text-sm text-muted-foreground">{c.exampleEnglish}</small>
    </div>
    <Button variant="outline" href={`/practice?retry=${c.id}`}>Practice</Button>
  </div>{/each}{#if !filtered.length}<p class="leading-[1.6]">
    No entries match your search.
  </p>{/if}
