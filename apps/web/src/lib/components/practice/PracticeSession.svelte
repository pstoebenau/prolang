<script lang="ts">
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

{#if session.error}<div class="error" role="alert">{session.error}</div>{/if}

<div class="topline">
  <div>
    <h1>
      {session.current && !session.finished
        ? session.current.mode === 'retry'
          ? 'Pronunciation practice'
          : 'Practice'
        : 'Practice'}
    </h1>
  </div>
  <span class="muted step"
    >{session.current && !session.finished
      ? `${session.index + 1} / ${session.queue.length}`
      : `${session.due} due · ${deck.length - session.learned} new`}</span
  >
</div>
<div class="workspace">
  <section
    class="practice-session"
    class:session-active={session.current && !session.finished}
    aria-label="Practice workspace"
  >
    {#if !session.current && !session.finished}
      <div class="empty">
        {#if session.error}
          <h2>Could not start practice.</h2>
          <Button onclick={() => session.begin()} disabled={session.busy}
            >Try again</Button
          >
        {:else}
          <p class="muted" role="status">Loading practice…</p>
        {/if}
        <noscript
          ><p>Enable JavaScript to use interactive practice.</p></noscript
        >
      </div>
    {:else if session.finished}
      <div class="empty">
        <h2>
          {session.queue.length ? 'Session complete.' : 'You’re all caught up.'}
        </h2>
        <p class="muted">
          {session.queue.length
            ? 'Your reviews have been saved. Keep going or come back when your next cards are due.'
            : 'No cards are due right now. You can browse the deck to practice individual words.'}
        </p>
        <div class="actions">
          <Button onclick={() => session.start()} disabled={session.busy}
            >Start another session</Button
          >
          <Button variant="outline" href="/deck">Browse deck</Button>
        </div>
      </div>
    {:else}
      <div class="recall-pane">
        <div class="prompt">
          <h2>{session.current.english}</h2>
        </div>
        {#if session.status}<div
            class="status"
            class:recording={session.recording}
            class:processing={session.busy && !session.recording}
            role="status"
            aria-live="polite"
          >
            {session.status}
          </div>{/if}
        {#if session.busy && !session.recording}<div
            class="processing-bar"
          ></div>{/if}
        <div class="actions">
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
        {#if session.answer}<div class="answer-context">
            <h2 lang="de">{session.answer.german}</h2>
            {#if session.answer.plural}<p class="muted">
                Plural: <span lang="de">{session.answer.plural}</span>
              </p>{/if}
            <p lang="de">
              {session.answer.example}<br /><span class="muted" lang="en"
                >{session.answer.exampleEnglish}</span
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
      {#if session.answer}<div class="answer">
          <PronunciationFeedback
            feedback={session.feedback}
            target={session.assessedTarget}
            busy={session.busy}
            referenceLoading={session.referenceLoading}
            onreference={session.reference}
            onyours={session.yours}
          />
          {#if session.referenceUrl}<audio
              bind:this={session.player}
              hidden
              src={session.referenceUrl}
              onerror={() =>
                (session.error =
                  'Reference playback failed. Try generating it again.')}
            ></audio>{/if}
          {#if session.attempt}<details>
              <summary>Edit target</summary>
              <p class="muted">
                Use a German phrase with the same meaning. Prolang does not
                verify translations. Recheck your existing recording and save
                the target for later.
              </p>
              <label for="target">Assessment target</label><Input
                id="target"
                maxlength={300}
                bind:value={session.target}
              />{#if session.answer.alternatives.length}<label for="saved"
                  >Saved alternatives</label
                ><select
                  id="saved"
                  onchange={(e) => (session.target = e.currentTarget.value)}
                  ><option value={session.answer.german}>Choose a target</option
                  >{#each session.answer.alternatives as a}<option value={a}
                      >{a}</option
                    >{/each}</select
                >{/if}
              <div class="actions">
                <Button
                  variant="outline"
                  disabled={session.busy || !session.target.trim()}
                  onclick={() => session.assess()}
                  >Accept & recheck recording</Button
                >
              </div>
            </details>{/if}
        </div>
        {#if session.current.mode === 'review'}<div class="grading">
            <h3>Recall</h3>
            <div class="actions">
              {#each [[1, 'Again'], [2, 'Hard'], [3, 'Good'], [4, 'Easy']] as g}<Button
                  variant={g[0] === 3 ? 'default' : 'outline'}
                  disabled={session.busy}
                  onclick={() => session.grade(Number(g[0]))}>{g[1]}</Button
                >{/each}
            </div>
          </div>{:else}<div class="grading">
            <p class="muted">
              Pronunciation only. This does not schedule vocabulary reviews.
            </p>
            <Button disabled={session.busy} href="/deck">Finish retry</Button>
          </div>{/if}
      {:else}<div class="answer-placeholder">
          <p class="muted">Your comparison appears here.</p>
        </div>{/if}
    {/if}
  </section>
  <PracticeHelp />
</div>
