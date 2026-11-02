<script lang="ts" module>
  // shadcn-svelte Button, adapted from the documented source (MIT).
  // https://www.shadcn-svelte.com/docs/components/button
  import { cva, type VariantProps } from 'class-variance-authority';
  import { cn, type WithElementRef } from '$lib/utils';
  import type {
    HTMLAnchorAttributes,
    HTMLButtonAttributes,
  } from 'svelte/elements';
  export const buttonVariants = cva(
    'button inline-flex items-center justify-center gap-2 rounded-lg border border-transparent font-semibold no-underline cursor-pointer transition-colors disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 focus-visible:outline-ring focus-visible:outline-3 focus-visible:outline-offset-4',
    {
      variants: {
        variant: {
          default: 'bg-primary text-primary-foreground hover:bg-primary/90',
          outline:
            'border-input bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
          ghost:
            'bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground',
          destructive:
            'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        },
        size: {
          default: 'min-h-[46px] px-[18px] py-2.5',
          sm: 'min-h-10 px-3 py-2',
        },
      },
      defaultVariants: { variant: 'default', size: 'default' },
    },
  );
  export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
    WithElementRef<HTMLAnchorAttributes> &
    VariantProps<typeof buttonVariants>;
</script>

<script lang="ts">
  let {
    class: className,
    variant = 'default',
    size = 'default',
    ref = $bindable(null),
    href = undefined,
    type = 'button',
    disabled,
    children,
    ...restProps
  }: ButtonProps = $props();
</script>

{#if href}
  <a
    bind:this={ref}
    data-slot="button"
    class={cn(buttonVariants({ variant, size }), className)}
    href={disabled ? undefined : href}
    aria-disabled={disabled}
    role={disabled ? 'link' : undefined}
    tabindex={disabled ? -1 : undefined}
    {...restProps}>{@render children?.()}</a
  >
{:else}
  <button
    bind:this={ref}
    data-slot="button"
    class={cn(buttonVariants({ variant, size }), className)}
    {type}
    {disabled}
    {...restProps}>{@render children?.()}</button
  >
{/if}
