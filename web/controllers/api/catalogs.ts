import { Authenticated, Get, QuerySchema } from '@teifi-digital/shopify-app-express/decorators';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { createGid, ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { Response, Request } from 'express-serve-static-core';
import { GetCatalogVariantPricesOptions } from '../../schemas/generated/get-catalog-variant-prices-options.js';
import { gql } from '../../services/gql/gql.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { minMoney, ZERO_MONEY } from '../../util/money.js';
import { decimalToMoney } from '../../util/decimal.js';
import { processConcurrently } from '@teifi-digital/shopify-app-toolbox/concurrency';
import { Int } from '../../services/gql/queries/generated/schema.js';
import { zip } from '@teifi-digital/shopify-app-toolbox/iteration';

@Authenticated()
export default class CatalogsController {
  // TODO: Dynamic pricing (qty based) and qty limits

  /**
   * Fetch product variant prices from catalogs.
   * Returns the lowest price for each product variant bcs thats how catalogs work.
   */
  @Get('/prices')
  @QuerySchema('get-catalog-variant-prices-options')
  async fetchCatalogPrices(
    req: Request<unknown, unknown, unknown, GetCatalogVariantPricesOptions>,
    res: Response<FetchCatalogPricesResponse>,
  ) {
    const session = res.locals.shopify.session;
    const paginationOptions = req.query;

    if (paginationOptions.catalogTypes.length !== paginationOptions.catalogIds.length) {
      throw new HttpError('Expected catalog types and ids to be the same length', 400);
    }

    const prices: Record<ID, Money> = {};

    if (paginationOptions.catalogIds.length === 0) {
      return res.json({ prices });
    }

    const catalogIds = [...zip(paginationOptions.catalogTypes, paginationOptions.catalogIds)].map(([type, id]) =>
      createGid(type, id),
    );
    const query = paginationOptions.productVariantIds.map(id => `variant_id:${id}`).join(' OR ');

    const graphql = new Graphql(session);
    const abortController = new AbortController();

    // Doing a query for multiple catalog ids is not possible after the first query due to nested pagination.
    // So just do it in batches of 4 parallel queries.

    await processConcurrently(
      catalogIds,
      async (id: ID) => {
        let pageInfo: { hasNextPage: boolean; endCursor: string | null } = { hasNextPage: true, endCursor: null };

        while (pageInfo.hasNextPage) {
          if (abortController.signal.aborted) {
            break;
          }

          const result = await gql.catalogs.getCatalogPrices.run(graphql, {
            id,
            first: 100 as Int,
            after: pageInfo.endCursor,
            query,
          });

          if (!result.catalog?.priceList) {
            abortController.abort();
            throw new HttpError('Catalog price list not found', 404);
          }

          pageInfo = result.catalog.priceList.prices.pageInfo;

          for (const { variant, price } of result.catalog.priceList.prices.nodes) {
            prices[variant.id] = minMoney(prices[variant.id] ?? ZERO_MONEY, decimalToMoney(price.amount));
          }
        }
      },
      { signal: abortController.signal, concurrency: 4 },
    ).catch((error: unknown) => {
      if (error instanceof AggregateError) {
        throw error.errors[0] ?? error;
      }

      throw error;
    });

    return res.json({ prices });
  }
}

export type FetchCatalogPricesResponse = {
  prices: Record<ID, Money>;
};

/*
*
*  @Get('/catalog-prices')
  @QuerySchema('pagination-options')
  async fetchCatalogPrices(
    req: Request<{ catalogId: string }, unknown, unknown, PaginationOptions>,
    res: Response<FetchCatalogPricesResponse>,
  ) {
    const session: Session = res.locals.shopify.session;
    const paginationOptions = req.query;
    const id = createGid('CompanyLocationCatalog', req.params.catalogId);

    const graphql = new Graphql(session);
    const response = await gql.catalogs.getCatalogPrices.run(graphql, {
      id,
      query: paginationOptions.query,
      first: paginationOptions.first,
      after: paginationOptions.after,
    });

    if (!response.catalog) {
      throw new HttpError('Catalog not found', 404);
    }

    if (!response.catalog.priceList) {
      throw new HttpError('Catalog has no price list', 404);
    }

    const prices = response.catalog.priceList.prices.nodes;
    const pageInfo = response.catalog.priceList.prices.pageInfo;

    return res.json({ prices, pageInfo });
  }
  *
  *
  *
  *
export type FetchCatalogPricesResponse = {
  prices: {
    variant: {
      id: ID;
    };
    price: {
      amount: Decimal;
    };
  }[];
  pageInfo: { hasNextPage: boolean; endCursor?: string | null };
};

  *
  * */
