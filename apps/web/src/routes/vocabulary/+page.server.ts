import { store } from '$lib/server/store';
export const load = ({ depends }: { depends: (key: string) => void }) => {
  depends('prolang:skills');
  return { history: store.vocabularyHistory() };
};
