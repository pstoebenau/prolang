import { redirect } from '@sveltejs/kit';
import { store } from '$lib/server/store';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ depends, url }) => {
  // Preserve previously bookmarked pronunciation retries.
  const retry = url.searchParams.get('retry');
  if (retry) redirect(307, `/practice?retry=${encodeURIComponent(retry)}`);
  depends('prolang:data');
  const deck = store.all();
  return {
    due: deck.filter((entry) => entry.card.reps > 0 && new Date(entry.card.due) <= new Date()).length,
    newCards: deck.filter((entry) => entry.card.reps === 0).length,
  };
};
