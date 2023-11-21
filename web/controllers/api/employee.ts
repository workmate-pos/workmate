import { Controller } from '@teifi-digital/shopify-app-express/controllers';
import { Session } from '@shopify/shopify-api';
import { db } from '../../services/db/db.js';
import { synchronizeEmployees } from '../../services/employee.js';

async function fetchEmployees(req: any, res: any) {
  const { shop }: Session = res.locals.shopify.session;
  // TODO: use querySchemaName
  const paginationOptions = {
    limit: Number.isNaN(parseInt(req.query.limit)) ? 25 : parseInt(req.query.limit),
    offset: Number.isNaN(parseInt(req.query.offset)) ? 0 : parseInt(req.query.offset),
    query: req.query.query,
  };

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

async function syncEmployees(req: any, res: any) {
  const session: Session = res.locals.shopify.session;
  await synchronizeEmployees(session);
  return res.json({ success: true });
}

export default {
  endpoints: [
    ['/', 'GET', fetchEmployees],
    ['/sync', 'POST', syncEmployees],
  ],
} satisfies Controller;
