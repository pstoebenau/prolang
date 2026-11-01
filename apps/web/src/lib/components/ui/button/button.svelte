<script lang="ts" module>
  // shadcn-svelte Button, adapted from the documented source (MIT).
  // https://www.shadcn-svelte.com/docs/components/button
  import { cva, type VariantProps } from 'class-variance-authority';
  import { cn, type WithElementRef } from '$lib/utils';
  import type {
    HTMLAnchorAttributes,
    HTMLButtonAttributes,
  } from 'svelte/elements';
  export const buttonVariants = cva('button', {
    variants: {
      variant: {
        default: 'primary',
        outline: 'outline',
        ghost: 'ghost',
        destructive: 'destructive',
      },
      size: { default: '', sm: 'small' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  });
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
