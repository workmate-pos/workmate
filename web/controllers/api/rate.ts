import {
  Authenticated,
  BodySchema,
  Get,
  Post,
  QuerySchema,
} from '@teifi-digital/shopify-app-express/decorators/default';
import type { Request, Response } from 'express-serve-static-core';
import type { Session } from '@shopify/shopify-api';
import type { FetchRatesOptions } from '../../schemas/generated/fetch-rates-options.js';
import type { SetRates } from '../../schemas/generated/set-rates.js';
import { db } from '../../services/db/db.js';
import { transaction } from '../../services/db/transaction.js';

@Authenticated()
export default class RateController {
  @Get('/')
  @QuerySchema('fetch-rates-options')
  async fetchRates(req: Request<unknown, unknown, unknown, FetchRatesOptions>, res: Response<FetchRatesResponse>) {
    const { shop }: Session = res.locals.shopify.session;
    const { ids } = req.query;

    const rates = await db.employeeRate.getMany({ shop, employeeIds: ids });

    return res.json({ rates });
  }

  @Post('/')
  @BodySchema('set-rates')
  async setRates(req: Request<unknown, unknown, SetRates>, res: Response<SetRatesResponse>) {
    const { shop }: Session = res.locals.shopify.session;
    const { rates } = req.body;

    await transaction(async () => {
      const ratesToUpsert = rates.filter(r => r.rate !== null);

      if (ratesToUpsert.length > 0) {
        await db.employeeRate.upsertMany({ shop, rates: rates.filter(r => r.rate !== null) });
      }

      const employeeIdsToDelete = rates.filter(r => r.rate === null);

      if (employeeIdsToDelete.length > 0) {
        await db.employeeRate.deleteMany({
          shop,
          employeeIds: employeeIdsToDelete.map(r => r.employeeId),
        });
      }
    });

    return res.json({ success: true });
  }
}

export type FetchRatesResponse = {
  rates: {
    employeeId: string;
    rate: number;
  }[];
};

export type SetRatesResponse = {
  success: boolean;
};
