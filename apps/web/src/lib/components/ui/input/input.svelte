<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';
  import { cn, type WithElementRef } from '$lib/utils';

  let {
    ref = $bindable(null),
    value = $bindable(),
    files = $bindable(),
    type = 'text',
    class: className,
    ...restProps
  }: WithElementRef<HTMLInputAttributes> = $props();
  const classes = $derived(
    cn(
      'min-h-[46px] min-w-0 rounded-md border border-input bg-card px-3 py-3 text-foreground placeholder:text-muted-foreground focus-visible:outline-ring focus-visible:outline-3 focus-visible:outline-offset-4 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive file:border-0 file:bg-transparent file:text-foreground file:font-medium',
      className,
    ),
  );
</script>

{#if type === 'file'}
  <input
    bind:this={ref}
    data-slot="input"
    type="file"
    bind:files
    bind:value
    class={classes}
    {...restProps}
  />
{:else}
  <input
    bind:this={ref}
    data-slot="input"
    {type}
    bind:value
    class={classes}
    {...restProps}
  />
{/if}
