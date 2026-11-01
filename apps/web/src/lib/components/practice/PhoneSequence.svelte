<script lang="ts">
  import PhoneSymbol from './PhoneSymbol.svelte';
  import type { PhonePair } from '$lib/phone-comparison';
  let {
    pairs,
    side,
    busy,
    onsound,
  }: {
    pairs: PhonePair[];
    side: 'expected' | 'heard';
    busy: boolean;
    onsound: (phone: string) => Promise<void>;
  } = $props();
</script>

<span class="phone-sequence">
  {#each pairs as pair, i (`${i}:${pair.expected}:${pair.heard}`)}
    <PhoneSymbol {pair} {side} {busy} {onsound} />
  {/each}
</span>

<style>
  .phone-sequence {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.1em;
  }
</style>
