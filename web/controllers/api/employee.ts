import { Controller } from '@teifi-digital/shopify-app-express/controllers';
import { Session } from '@shopify/shopify-api';
import { db } from '../../services/db/index.js';

async function fetchEmployees(req: any, res: any) {
  const { shop }: Session = res.locals.shopify.session;
  // TODO: use querySchemaName
  const paginationOptions = {
    limit: Number.isNaN(parseInt(req.query.limit)) ? 25 : parseInt(req.query.limit),
    offset: Number.isNaN(parseInt(req.query.offset)) ? 0 : parseInt(req.query.offset),
  };

  const employees = await db.employee.page({
    shop,
    limit: paginationOptions.limit,
    offset: paginationOptions.offset,
  });

  return res.json({ employees });
}

export default {
  endpoints: [['/', 'GET', fetchEmployees]],
} satisfies Controller;
