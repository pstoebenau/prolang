import { store } from '$lib/server/store';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = ({ depends }) => {
  depends('prolang:data');
  return { deck: store.all(), history: store.history() };
};
