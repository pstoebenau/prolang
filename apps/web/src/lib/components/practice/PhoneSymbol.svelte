<script lang="ts">
  import { Tooltip } from 'bits-ui';
  import { phoneGuidance, soundGuidance } from '$lib/phone-guidance';
  import type { PhonePair } from '$lib/phone-comparison';

  let {
    pair,
    side,
    busy,
  }: {
    pair: PhonePair;
    side: 'expected' | 'heard';
    busy: boolean;
  } = $props();
  const tooltipId = $props.id();
  let open = $state(false);
  const phone = $derived(pair[side]);
  const differs = $derived(pair.expected !== pair.heard);
  const correction = $derived(phoneGuidance(pair));
  const instruction = $derived(
    correction?.instruction ?? soundGuidance(pair.expected),
  );
</script>

<Tooltip.Root bind:open disableCloseOnTriggerClick>
  <Tooltip.Trigger
    class="inline-flex min-h-9 min-w-7 cursor-help items-center justify-center rounded-sm border-0 bg-transparent p-0.5 text-inherit hover:bg-accent focus-visible:bg-accent disabled:cursor-wait disabled:opacity-60"
    disabled={busy}
    aria-label={`${side === 'expected' ? 'Expected' : 'Detected'} ${phone || 'no sound'}: pronunciation tips`}
    onclick={() => {
      open = true;
    }}
  >
    {#if differs}<mark
        class="rounded-sm border-b-2 border-destructive bg-destructive/12 px-[0.12em] text-destructive"
        >{phone || '—'}</mark
      >{:else}{phone}{/if}
  </Tooltip.Trigger>
  <Tooltip.Portal>
    <Tooltip.Content id={tooltipId} sideOffset={8} collisionPadding={12}>
      {#snippet child({ props, wrapperProps })}
        <div {...wrapperProps}>
          <div
            {...props}
            id={tooltipId}
            role="tooltip"
            aria-hidden={!open}
            class="z-50 w-[min(340px,calc(100vw-24px))] rounded-lg border bg-popover p-4 font-sans text-sm leading-normal text-popover-foreground shadow-[0_6px_24px_color-mix(in_srgb,var(--foreground)_12%,transparent)]"
          >
            <strong
              >Expected
              <span class="ml-2 text-2xl">{pair.expected || 'no sound'}</span
              ></strong
            >
            {#if instruction}<p class="mt-2.5 leading-normal">
                {instruction}
              </p>{/if}
            <p class="text-xs text-muted-foreground mt-2.5 leading-normal">
              {#if pair.expected}
                Use Native to hear the word and Yours to compare your recording.
              {:else}
                This dash marks a missing or extra sound.
              {/if}
            </p>
          </div>
        </div>
      {/snippet}
    </Tooltip.Content>
  </Tooltip.Portal>
</Tooltip.Root>
