import { fail } from '@sveltejs/kit';
import { limitRequestBody } from '$lib/server/http';
import { store } from '$lib/server/store';
import type { Actions } from './$types';
export const actions = {
  default: async ({ request }) => {
    const data = await (await limitRequestBody(request)).formData();
    const backup = data.get('backup');
    if (data.get('confirm') !== 'REPLACE' || !(backup instanceof File))
      return fail(400, { message: 'Choose a backup and confirm replacement.' });
    if (backup.size > 24 * 1024 * 1024)
      return fail(413, { message: 'Backup exceeds 24 MB.' });
    try {
      store.restore(JSON.parse(await backup.text()));
    } catch {
      return fail(400, {
        message: 'Invalid backup. Existing data was preserved.',
      });
    }
    return { message: 'Backup restored.' };
  },
} satisfies Actions;
