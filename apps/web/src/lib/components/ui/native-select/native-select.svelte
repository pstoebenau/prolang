<script lang="ts">
  import type { HTMLSelectAttributes } from 'svelte/elements';
  import { cn, type WithElementRef } from '$lib/utils';

  let {
    ref = $bindable(null),
    value = $bindable(),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLSelectAttributes> = $props();
</script>

<select
  bind:this={ref}
  bind:value
  data-slot="native-select"
  class={cn(
    'min-h-[46px] rounded-md border border-input bg-card p-3 text-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive',
    className,
  )}
  {...restProps}
>
  {@render children?.()}
</select>
