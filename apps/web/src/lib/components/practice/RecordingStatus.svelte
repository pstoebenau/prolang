<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils';

  let {
    recording = false,
    processing = false,
    children,
  }: {
    recording?: boolean;
    processing?: boolean;
    children: Snippet;
  } = $props();
</script>

<div
  class={cn(
    'min-h-6 text-primary',
    processing && 'motion-safe:animate-processing',
  )}
  role="status"
  aria-live="polite"
>
  {#if recording}<span
      class="mr-2.5 inline-block size-[9px] rounded-full bg-destructive motion-safe:animate-recording"
      aria-hidden="true"
    ></span>{/if}{@render children()}
</div>
