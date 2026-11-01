<script lang="ts">
  import PracticeSession from '$lib/components/practice/PracticeSession.svelte';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
</script>

<svelte:head
  ><title>Prolang · German practice</title><meta
    name="description"
    content="Your local German vocabulary and pronunciation workspace"
  /></svelte:head
>
{#key data.retry}<PracticeSession deck={data.deck} retry={data.retry} />{/key}
