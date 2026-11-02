import { store } from '$lib/server/store';
import { readingProgress } from '$lib/skills/progression';
export const load = ({ depends }: { depends: (key: string) => void }) => {
  depends('prolang:skills');
  const history = store.readingHistory();
  return { history, progress: readingProgress(history) };
};
