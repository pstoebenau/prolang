<script lang="ts">
  import RecordingStatus from '$lib/components/practice/RecordingStatus.svelte';
  import { NativeSelect } from '$lib/components/ui/native-select';
  import { cn } from '$lib/utils';
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  import PracticeHelp from './PracticeHelp.svelte';
  import PronunciationFeedback from './PronunciationFeedback.svelte';
  import { createPracticeSession } from '$lib/practice/session.svelte';
  import type { DeckEntry } from '$lib/types';
  let { deck, retry }: { deck: DeckEntry[]; retry: string | null } = $props();
  const session = createPracticeSession(
    () => deck,
    () => retry,
  );
</script>

{#if session.error}<div
    class="my-[18px] border-l-[3px] border-destructive bg-destructive/12 px-[18px] py-3.5 text-destructive"
    role="alert"
  >
    {session.error}
  </div>{/if}

<div class="flex items-center justify-between gap-3 max-[750px]:items-start">
  <div>
    <h1
      class="font-semibold mt-1.5 mb-0 text-2xl tracking-[-0.6px] max-[750px]:text-2xl"
    >
      {session.current && !session.finished
        ? session.current.mode === 'retry'
          ? 'Pronunciation practice'
          : 'Practice'
        : 'Practice'}
    </h1>
  </div>
  <span
    class="text-sm text-muted-foreground tabular-nums max-[750px]:text-right"
    data-testid="step"
    >{session.current && !session.finished
      ? `${session.index + 1} / ${session.queue.length}`
      : `${session.due} due · ${deck.length - session.learned} new`}</span
  >
</div>
<div class="mt-6">
  <section
    class={cn(
      'border-t',
      session.current &&
        !session.finished &&
        'grid grid-cols-1 gap-x-8 min-[751px]:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]',
    )}
    aria-label="Practice workspace"
  >
    {#if !session.current && !session.finished}
      <div class="max-w-[600px] pt-8 pb-10">
        {#if session.error}
          <h2 class="mb-3 text-[22px] font-semibold mt-0">
            Could not start practice.
          </h2>
          <Button onclick={() => session.begin()} disabled={session.busy}
            >Try again</Button
          >
        {:else}
          <p class="text-sm text-muted-foreground leading-normal" role="status">
            Loading practice…
          </p>
        {/if}
        <noscript
          ><p class="leading-normal">
            Enable JavaScript to use interactive practice.
          </p></noscript
        >
      </div>
    {:else if session.finished}
      <div class="max-w-[600px] pt-8 pb-10">
        <h2 class="mb-3 text-[22px] font-semibold mt-0">
          {session.queue.length ? 'Session complete.' : 'You’re all caught up.'}
        </h2>
        <p class="text-sm text-muted-foreground leading-normal">
          {session.queue.length
            ? 'Your reviews have been saved. Keep going or come back when your next cards are due.'
            : 'No cards are due right now. You can browse the deck to practice individual words.'}
        </p>
        <div class="flex flex-wrap items-center gap-2.5 my-3.5">
          <Button onclick={() => session.start()} disabled={session.busy}
            >Start another session</Button
          >
          <Button variant="outline" href="/deck">Browse deck</Button>
        </div>
      </div>
    {:else}
      <div class="min-w-0 py-7">
        <div class="pb-5">
          <h2
            class="my-4 text-[clamp(30px,3.2vw,44px)] leading-[1.16] font-[550] tracking-[-1.3px] [overflow-wrap:anywhere]"
          >
            {session.current.english}
          </h2>
        </div>
        {#if session.status}<RecordingStatus
            recording={session.recording}
            processing={session.busy && !session.recording}
          >
            {session.status}
          </RecordingStatus>{/if}
        {#if session.busy && !session.recording}<div
            class="h-0.5 origin-left bg-primary motion-safe:animate-recording"
            data-testid="processing-bar"
          ></div>{/if}
        <div class="flex flex-wrap items-center gap-2.5 my-3.5">
          {#if session.recording}<Button onclick={() => session.stopRecording()}
              >Stop & check</Button
            ><Button variant="outline" onclick={session.cancel}
              >Cancel recording</Button
            >{:else}<Button disabled={session.busy} onclick={session.record}
              >{session.answer ? 'Record again' : 'Record German'}</Button
            >{#if !session.answer}<Button
                variant="outline"
                disabled={session.busy}
                onclick={session.reveal}>Reveal answer</Button
              >{/if}{#if session.busy}<Button
                variant="outline"
                onclick={session.cancel}>Cancel processing</Button
              >{/if}{/if}
        </div>
        {#if session.answer}<div class="mt-7 border-t pt-5">
            <h2 class="font-semibold mt-0 mb-2.5 text-[26px]" lang="de">
              {session.answer.german}
            </h2>
            {#if session.answer.plural}<p
                class="text-sm text-muted-foreground leading-normal my-2"
              >
                Plural: <span lang="de">{session.answer.plural}</span>
              </p>{/if}
            <p class="leading-normal my-2" lang="de">
              {session.answer.example}<br /><span
                class="text-sm text-muted-foreground"
                lang="en">{session.answer.exampleEnglish}</span
              >
            </p>
            <Button
              variant="outline"
              disabled={session.busy || session.referenceLoading}
              aria-busy={session.referenceLoading}
              onclick={() => session.reference()}>Listen to phrase</Button
            >
          </div>{/if}
      </div>
      {#if session.answer}<div
          class="min-w-0 border-l pl-8 pt-7 pb-6 motion-safe:animate-reveal max-[750px]:border-l-0 max-[750px]:border-t max-[750px]:py-6 max-[750px]:pl-0"
          data-testid="answer"
        >
          <PronunciationFeedback
            feedback={session.feedback}
            target={session.assessedTarget}
            busy={session.busy}
            referenceLoading={session.referenceLoading}
            onreference={session.reference}
            onyours={session.yours}
          />
          {#if session.referenceUrl}<audio
              class="h-10 w-full max-w-[440px]"
              bind:this={session.player}
              hidden
              src={session.referenceUrl}
              onerror={() =>
                (session.error =
                  'Reference playback failed. Try generating it again.')}
            ></audio>{/if}
          {#if session.attempt}<details>
              <summary class="min-h-11 cursor-pointer py-2.5"
                >Edit target</summary
              >
              <p class="text-sm text-muted-foreground leading-normal">
                Use a German phrase with the same meaning. Prolang does not
                verify translations. Recheck your existing recording and save
                the target for later.
              </p>
              <label class="mt-3 mb-1.5 block text-sm" for="target"
                >Assessment target</label
              ><Input
                id="target"
                maxlength={300}
                bind:value={session.target}
              />{#if session.answer.alternatives.length}<label
                  class="mt-3 mb-1.5 block text-sm"
                  for="saved">Saved alternatives</label
                ><NativeSelect
                  id="saved"
                  onchange={(e) => (session.target = e.currentTarget.value)}
                  ><option value={session.answer.german}>Choose a target</option
                  >{#each session.answer.alternatives as a}<option value={a}
                      >{a}</option
                    >{/each}</NativeSelect
                >{/if}
              <div class="flex flex-wrap items-center gap-2.5 my-3.5">
                <Button
                  variant="outline"
                  disabled={session.busy || !session.target.trim()}
                  onclick={() => session.assess()}
                  >Accept & recheck recording</Button
                >
              </div>
            </details>{/if}
        </div>
        {#if session.current.mode === 'review'}<div
            class="col-span-full grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 border-t py-5 max-[750px]:block"
          >
            <h3 class="text-[17px] font-[650] col-start-1">Recall</h3>
            <div
              class="flex flex-wrap items-center gap-2.5 col-start-2 row-start-1 m-0 max-[750px]:mt-4"
            >
              {#each [[1, 'Again'], [2, 'Hard'], [3, 'Good'], [4, 'Easy']] as g}<Button
                  class="min-w-[76px] max-[750px]:min-w-0 max-[750px]:flex-1"
                  variant={g[0] === 3 ? 'default' : 'outline'}
                  disabled={session.busy}
                  onclick={() => session.grade(Number(g[0]))}>{g[1]}</Button
                >{/each}
            </div>
          </div>{:else}<div
            class="col-span-full grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 border-t py-5 max-[750px]:block"
          >
            <p class="text-muted-foreground col-start-1 mt-1.5 text-sm">
              Pronunciation only. This does not schedule vocabulary reviews.
            </p>
            <Button disabled={session.busy} href="/deck">Finish retry</Button>
          </div>{/if}
      {:else}<div
          class="min-w-0 border-l pl-8 pt-7 pb-6 max-[750px]:border-l-0 max-[750px]:border-t max-[750px]:py-6 max-[750px]:pl-0"
        >
          <p class="text-sm text-muted-foreground leading-normal max-w-[38ch]">
            Your comparison appears here.
          </p>
        </div>{/if}
    {/if}
  </section>
  <PracticeHelp />
</div>
