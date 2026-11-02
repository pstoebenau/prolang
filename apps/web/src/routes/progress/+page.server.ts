import { store } from '$lib/server/store';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = ({ depends }) => {
  depends('prolang:data');
  depends('prolang:skills');
  return {
    deck: store.all(),
    history: store.history(),
    reading: store.readingHistory(),
    vocabulary: store.vocabularyHistory(),
  };
};
