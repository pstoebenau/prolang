import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { store } from '$lib/server/store';
export const GET: RequestHandler = async () => {
  return json(store.all());
};
