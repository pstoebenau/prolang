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
    side === 'expected' && correction
      ? correction.instruction
      : phone
        ? soundGuidance(phone)
        : correction?.instruction,
  );
  const label = $derived(side === 'expected' ? 'Expected' : 'Detected');
</script>

<Tooltip.Root bind:open disableCloseOnTriggerClick>
  <Tooltip.Trigger
    class="phone-symbol"
    disabled={busy}
    aria-label={`${label} ${phone || 'no sound'}: pronunciation tips`}
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
              >{label}
              <span class="preview-symbol">{phone || '—'}</span></strong
            >
            {#if instruction}<p>{instruction}</p>{/if}
            {#if side === 'heard' && correction && pair.expected}
              <p class="target-note">
                Aim for <strong>{pair.expected}</strong>: {correction.instruction}
              </p>
            {/if}
            <p class="preview-note">
              {#if phone}
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
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
  }
  :global(.phone-symbol:hover),
  :global(.phone-symbol:focus-visible) {
    background: #e4e9dd;
  }
  :global(.phone-symbol:disabled) {
    cursor: wait;
    opacity: 0.6;
  }
  mark {
    color: #8c3028;
    background: #f3dfd8;
    border-bottom: 2px solid #a24737;
    border-radius: 3px;
    padding: 0 0.12em;
  }
  :global(.phoneme-tooltip) {
    z-index: 50;
    width: min(340px, calc(100vw - 24px));
    padding: 16px;
    border: 1px solid #c8cec4;
    border-radius: 8px;
    background: #fafaf6;
    color: #232923;
    box-shadow: 0 6px 24px #23292320;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
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
    color: #667060;
    font-size: 12px;
  }
  .target-note {
    border-top: 1px solid #d3d9cd;
    padding-top: 10px;
  }
</style>
