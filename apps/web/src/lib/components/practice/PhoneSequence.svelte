<script lang="ts">
  import PhoneSymbol from './PhoneSymbol.svelte';
  import type { PhonePair } from '$lib/phone-comparison';
  let {
    pairs,
    side,
    busy,
  }: {
    pairs: PhonePair[];
    side: 'expected' | 'heard';
    busy: boolean;
  } = $props();
</script>

<span class="inline-flex flex-wrap items-baseline gap-[0.1em]">
  {#each pairs as pair, i (`${i}:${pair.expected}:${pair.heard}`)}
    <PhoneSymbol {pair} {side} {busy} />
  {/each}
</span>
