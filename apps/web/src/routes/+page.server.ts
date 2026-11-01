import { store } from '$lib/server/store';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = ({ depends, url }) => {
  depends('prolang:data');
  return { deck: store.all(), retry: url.searchParams.get('retry') };
};
