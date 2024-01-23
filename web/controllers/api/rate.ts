import {
  Authenticated,
  BodySchema,
  Get,
  Post,
  QuerySchema,
} from '@teifi-digital/shopify-app-express/decorators/default/index.js';
import type { Request, Response } from 'express-serve-static-core';
import type { Session } from '@shopify/shopify-api';
import type { Ids } from '../../schemas/generated/ids.js';
import type { SetRates } from '../../schemas/generated/set-rates.js';
import { db } from '../../services/db/db.js';
import { transaction } from '../../services/db/transaction.js';
import type { ID } from '../../schemas/generated/shop-settings.js';
import { BigDecimal, Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';

@Authenticated()
export default class RateController {
  @Get('/')
  @QuerySchema('ids')
  async fetchRates(req: Request<unknown, unknown, unknown, Ids>, res: Response<FetchRatesResponse>) {
    const { shop }: Session = res.locals.shopify.session;
    const { ids } = req.query;

    const rates = await db.employeeRate.getMany({ shop, employeeIds: ids });

    return res.json({
      rates: rates.map(({ employeeId, rate }) => ({
        employeeId: employeeId as ID,
        rate: BigDecimal.fromString(rate).toMoney(),
      })),
    });
  }

  @Post('/')
  @BodySchema('set-rates')
  async setRates(req: Request<unknown, unknown, SetRates>, res: Response<SetRatesResponse>) {
    const { shop }: Session = res.locals.shopify.session;
    const { rates } = req.body;

    await transaction(async () => {
      const ratesToUpsert = rates.filter(
        (r): r is typeof r & { rate: NonNullable<(typeof r)['rate']> } => r.rate !== null,
      );

      if (ratesToUpsert.length > 0) {
        await db.employeeRate.upsertMany({
          shop,
          rates: ratesToUpsert,
        });
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
    employeeId: ID;
    rate: Money;
  }[];
};

export type SetRatesResponse = {
  success: boolean;
};
