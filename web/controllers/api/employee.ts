import { Session } from '@shopify/shopify-api';
import { db } from '../../services/db/db.js';
import { synchronizeEmployees } from '../../services/employee.js';
import { Authenticated, Get, Post, QuerySchema } from '@teifi-digital/shopify-app-express/decorators/default';
import type { PaginationOptions } from '../../schemas/generated/pagination-options.js';
import type { Request, Response } from 'express-serve-static-core';

@Authenticated()
export default class EmployeeController {
  @Get('/')
  @QuerySchema('pagination-options')
  async fetchEmployees(req: Request<unknown, unknown, unknown, PaginationOptions>, res: Response) {
    const { shop }: Session = res.locals.shopify.session;
    const paginationOptions = req.query;

    if (paginationOptions.query) {
      paginationOptions.query = paginationOptions.query.replace(/%/g, '').replace(/_/g, '');
      paginationOptions.query = `%${paginationOptions.query}%`;
    }

    const employees = await db.employee.page({
      shop,
      limit: paginationOptions.limit,
      offset: paginationOptions.offset,
      query: paginationOptions.query,
    });

    return res.json({ employees });
  }

  @Post('/sync')
  async syncEmployees(req: Request, res: Response) {
    const session: Session = res.locals.shopify.session;
    await synchronizeEmployees(session);
    return res.json({ success: true });
  }
}
