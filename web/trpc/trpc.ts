import { initTRPC, TRPCError } from '@trpc/server';
import { Session } from '@shopify/shopify-api';
import { IGetManyResult as User } from '../services/db/queries/generated/employee.sql.js';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { LocalsTeifiUser } from '../decorators/permission.js';

export type TRPCContext = {
  /**
   * A user session, if any.
   */
  session?: Session;
  /**
   * The user making the request, if any.
   */
  user?: User;
};

export async function createTRPCContext({ res }: CreateExpressContextOptions): Promise<TRPCContext> {
  const session: Session = res.locals.shopify.session;
  const { user }: LocalsTeifiUser = res.locals.teifi.user;

  return {
    session,
    user,
  };
}

const t = initTRPC.context<TRPCContext>().create();

/**
 * A procedure that requires a session to be present.
 */
export const authenticatedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  // narrow the session type s.t. it is not undefined in following queries/mutations
  return next({ ctx: { ...ctx, session: ctx.session } });
});

export const userAuthenticatedProcedure = authenticatedProcedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const unauthenticatedProcedure = t.procedure;

export const router = t.router;
