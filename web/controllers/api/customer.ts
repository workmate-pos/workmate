import { Get, Post, QuerySchema, Authenticated } from '@teifi-digital/shopify-app-express/decorators/default';
import { Session } from '@shopify/shopify-api';
import { db } from '../../services/db/db.js';
import { synchronizeCustomers } from '../../services/customer.js';
import type { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import type { Request, Response } from 'express-serve-static-core';

@Authenticated()
export default class CustomerController {
  @Get('/')
  @QuerySchema('pagination-options')
  async fetchCustomers(req: Request<unknown, unknown, unknown, PaginationOptions>, res: Response) {
    const { shop }: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    if (paginationOptions.query) {
      paginationOptions.query = paginationOptions.query.replace(/%/g, '').replace(/_/g, '');
      paginationOptions.query = `%${paginationOptions.query}%`;
    }

    const customers = await db.customer.page({
      shop,
      limit: paginationOptions.limit,
      offset: paginationOptions.offset,
      query: paginationOptions.query,
    });

    return res.json({ customers });
  }

  @Post('/sync')
  async syncCustomers(req: Request, res: Response) {
    const session: Session = res.locals.shopify.session;
    await synchronizeCustomers(session);
    return res.json({ success: true });
  }
}
