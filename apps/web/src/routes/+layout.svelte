<script lang="ts">
  import './layout.css';
  import { Button } from '$lib/components/ui/button';
  import { page } from '$app/state';
  let { children } = $props();
  const navigation = [
    ['/practice', 'Practice'],
    ['/deck', 'Deck'],
    ['/progress', 'Progress'],
    ['/settings', 'Settings'],
  ];
</script>

<header class:practice-header={page.url.pathname === '/practice'}>
  <a class="brand" href="/" aria-label="Prolang home">Prolang<span>.</span></a>
  <nav aria-label="Main navigation">
    {#each navigation as [href, label]}
      <Button
        variant="ghost"
        {href}
        class={page.url.pathname === href ? 'active' : ''}
        aria-current={page.url.pathname === href ? 'page' : undefined}
        >{label}</Button
      >
    {/each}
  </nav>
</header>
<main class:practice-page={page.url.pathname === '/practice'}>
  {@render children()}
  <footer>
    Prolang · Local German practice · Experimental pronunciation feedback
  </footer>
</main>

<style>
  .brand { display: inline-block; color: inherit; text-decoration: none; }
</style>
