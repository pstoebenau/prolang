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
    class="phone-symbol"
    disabled={busy}
    aria-label={`${side === 'expected' ? 'Expected' : 'Detected'} ${phone || 'no sound'}: pronunciation tips`}
    onclick={() => {
      open = true;
    }}
  >
    {#if differs}<mark>{phone || '—'}</mark>{:else}{phone}{/if}
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
            class="phoneme-tooltip"
          >
            <strong
              >Expected
              <span class="preview-symbol">{pair.expected || 'no sound'}</span
              ></strong
            >
            {#if instruction}<p>{instruction}</p>{/if}
            <p class="preview-note">
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

<style>
  :global(.phone-symbol) {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    min-width: 28px;
    min-height: 36px;
    padding: 2px;
    color: inherit;
    font: inherit;
    border: 0;
    border-radius: calc(var(--radius) - 3px);
    background: transparent;
    cursor: default;
  }
  :global(button.phone-symbol) {
    cursor: help;
  }
  :global(button.phone-symbol:hover),
  :global(button.phone-symbol:focus-visible) {
    background: var(--accent);
  }
  :global(.phone-symbol:disabled) {
    cursor: wait;
    opacity: 0.6;
  }
  mark {
    color: var(--destructive);
    background: color-mix(in srgb, var(--destructive) 12%, var(--background));
    border-bottom: 2px solid var(--destructive);
    border-radius: calc(var(--radius) - 4px);
    padding: 0 0.12em;
  }
  :global(.phoneme-tooltip) {
    z-index: 50;
    width: min(340px, calc(100vw - 24px));
    padding: 16px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--popover);
    color: var(--popover-foreground);
    box-shadow: 0 6px 24px
      color-mix(in srgb, var(--foreground) 12%, transparent);
    font-family: var(--font-sans);
    font-size: 14px;
    line-height: 1.5;
  }
  .preview-symbol {
    font-size: 24px;
    margin-left: 8px;
  }
  p {
    margin: 10px 0 0;
  }
  .preview-note {
    color: var(--muted-foreground);
    font-size: 12px;
  }
</style>
