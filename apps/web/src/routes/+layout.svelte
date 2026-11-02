<script lang="ts">
  import './layout.css';
  import { cn } from '$lib/utils';
  import { Button } from '$lib/components/ui/button';
  import { page } from '$app/state';
  let { children } = $props();
  const navigation = [
    ['/practice', 'Practice'],
    ['/reading', 'Read aloud'],
    ['/vocabulary', 'Vocabulary'],
    ['/deck', 'Deck'],
    ['/progress', 'Progress'],
    ['/settings', 'Settings'],
  ];
</script>

<header
  class={cn(
    'mx-auto flex items-center justify-between border-b max-[750px]:block',
    page.url.pathname === '/practice'
      ? 'max-w-[1440px] px-8 py-3.5 max-[750px]:px-5'
      : 'max-w-[1200px] px-10 py-7 max-[750px]:px-5 max-[750px]:py-[18px]',
  )}
>
  <a
    class={cn(
      'inline-block text-[29px] font-[750] tracking-[-1.5px] text-inherit no-underline',
      page.url.pathname === '/practice'
        ? 'max-[750px]:mb-2'
        : 'max-[750px]:mb-4',
    )}
    href="/"
    aria-label="Prolang home">Prolang<span class="text-primary">.</span></a
  >
  <nav
    class="flex flex-wrap gap-1.5 max-[750px]:justify-between"
    aria-label="Main navigation"
  >
    {#each navigation as [href, label]}
      <Button
        variant="ghost"
        {href}
        class={page.url.pathname === href
          ? 'font-medium bg-accent text-accent-foreground max-[750px]:px-3 max-[750px]:py-[9px]'
          : 'font-medium max-[750px]:px-3 max-[750px]:py-[9px]'}
        aria-current={page.url.pathname === href ? 'page' : undefined}
        >{label}</Button
      >
    {/each}
  </nav>
</header>
<main
  class={cn(
    'mx-auto',
    page.url.pathname === '/practice'
      ? 'max-w-[1180px] px-8 pt-6 pb-8 max-[750px]:p-5 max-[750px]:py-6'
      : 'max-w-[1120px] px-10 pt-[46px] pb-20 max-[750px]:px-[22px] max-[750px]:pt-[30px] max-[750px]:pb-[60px]',
  )}
>
  {@render children()}
  <footer
    class={cn(
      'text-xs text-muted-foreground',
      page.url.pathname === '/practice' ? 'mt-6' : 'mt-[50px]',
    )}
  >
    Prolang · Local German practice · Experimental pronunciation feedback
  </footer>
</main>
