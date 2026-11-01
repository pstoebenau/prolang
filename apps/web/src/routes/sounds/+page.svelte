<script lang="ts">
  import recordings from '$lib/phone-audio.json';
</script>

<svelte:head><title>Sound recording credits · Prolang</title></svelte:head>
<h1>Sound recording credits</h1>
<p>These phonetic examples are bundled with Prolang for local playback. They demonstrate sound quality; use the native word recording for German timing and context.</p>
<p>Recordings were converted from Ogg to MP3 without editing their content. Each recording retains its original license.</p>
{#each Object.entries(recordings) as [phone, recording]}
  <section>
    <h2>{phone} · {recording.name}</h2>
    <p>{recording.author}</p>
    <p><a href={recording.source}>Original recording</a> · <a href={recording.licenseUrl}>{recording.license}</a></p>
  </section>
{/each}
<style>
  section { border-top: 1px solid #d3d9cd; padding: 10px 0; }
</style>
