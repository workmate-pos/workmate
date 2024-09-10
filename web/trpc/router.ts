import { router, createTRPCContext } from './trpc.js';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { productVariants } from './routes/product-variants.js';

export const appRouter = router({
  productVariants,
});

/**
 * This type can be used by the tRPC client to infer all route types.
 */
export type AppRouter = typeof appRouter;

export const trpcHandler = createExpressMiddleware({
  router: appRouter,
  createContext: createTRPCContext,
  batching: {
    enabled: true,
  },
});
