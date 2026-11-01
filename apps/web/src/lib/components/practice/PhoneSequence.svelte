<script lang="ts">
  import type { PhonePair } from '$lib/phone-comparison';
  let { pairs, side }: { pairs: PhonePair[]; side: 'expected' | 'heard' } =
    $props();
</script>

<span class="phone-sequence">
  {#each pairs as pair}
    {#if pair.expected !== pair.heard}
      <mark
        title={`Expected ${pair.expected || 'no sound'}; detected ${pair.heard || 'no sound'}`}
      >
        {pair[side] || '—'}
      </mark>
    {:else}
      <span>{pair[side]}</span>
    {/if}
  {/each}
</span>

<style>
  .phone-sequence {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.15em;
  }
  mark {
    color: #8c3028;
    background: #f3dfd8;
    border-bottom: 2px solid #a24737;
    border-radius: 3px;
    padding: 0 0.12em;
  }
</style>
