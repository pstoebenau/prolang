<script lang="ts">
  import './layout.css';
  import { Button } from '$lib/components/ui/button';
  import { page } from '$app/state';
  let { children } = $props();
  const navigation = [
    ['/', 'Practice'],
    ['/deck', 'Deck'],
    ['/progress', 'Progress'],
    ['/settings', 'Settings'],
  ];
</script>

<header class:practice-header={page.url.pathname === '/'}>
  <div class="brand">Prolang<span>.</span></div>
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
<main class:practice-page={page.url.pathname === '/'}>
  {@render children()}
  <footer>
    Prolang · Local German practice · Experimental pronunciation feedback
  </footer>
</main>
