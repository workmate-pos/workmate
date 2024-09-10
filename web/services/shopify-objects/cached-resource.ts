import { sentryErr } from '@teifi-digital/shopify-app-express/services';
import { escapeTransaction } from '../db/client.js';

export function createCachedResource<Arg extends {}, Resource>({
  getCached,
  getFresh,
  persist,
  revalidateInBackground = false,
}: {
  getCached: (arg: Arg) => Promise<{ resource: Resource; shouldRevalidate: boolean } | null>;
  getFresh: (arg: Arg) => Promise<Resource | null>;
  persist: (arg: Arg, resource: Resource | null) => Promise<void>;
  revalidateInBackground?: boolean;
}) {
  // we store pending revalidate promises to avoid concurrent revalidations.
  // concurrent revalidations can cause race conditions leading to stale data.
  const revalidatePromises: Record<string, Promise<Resource | null>> = {};

  const get = async (arg: Arg) =>
    await escapeTransaction(async () => {
      const cached = await getCached(arg).catch(error => {
        sentryErr(new Error('Failed to get resource from cache', { cause: error }));
        return null;
      });

      if (cached && !cached.shouldRevalidate) {
        return cached.resource;
      }

      const hash = JSON.stringify(arg, Object.keys(arg).sort());

      let revalidatePromise = revalidatePromises[hash];

      if (!revalidatePromise) {
        revalidatePromise = getFresh(arg)
          .then(async resource => (await persist(arg, resource), resource))
          .finally(() => delete revalidatePromises[hash]);

        revalidatePromises[hash] = revalidatePromise;
      }

      if (cached && revalidateInBackground) {
        revalidatePromise.catch(error =>
          sentryErr(new Error('Failed to revalidate resource in the background', { cause: error })),
        );

        return cached.resource;
      }

      return await revalidatePromise;
    });

  return { get, persist };
}
