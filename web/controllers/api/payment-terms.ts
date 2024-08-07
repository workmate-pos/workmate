import { Authenticated, Get } from '@teifi-digital/shopify-app-express/decorators';
import { Request, Response } from 'express-serve-static-core';
import { Graphql } from '@teifi-digital/shopify-app-express/services';
import { gql } from '../../services/gql/gql.js';
import { PaymentTermsType } from '../../services/gql/queries/generated/schema.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';

@Authenticated()
export default class PaymentTermsController {
  @Get('/templates/:type')
  async fetchPaymentTerms(req: Request<{ type: string }>, res: Response<FetchPaymentTermsResponse>) {
    const session = res.locals.shopify.session;
    const { type } = req.params;

    if (!isPaymentTermsType(type)) {
      throw new HttpError(`Invalid payment terms type ${type}`, 400);
    }

    const graphql = new Graphql(session);
    const { paymentTermsTemplates } = await gql.paymentTerms.getTemplates.run(graphql, { type });

    return res.json({ paymentTermsTemplates });
  }
}

function isPaymentTermsType(type: string): type is PaymentTermsType {
  return ['RECEIPT', 'NET', 'FIXED', 'FULFILLMENT', 'UNKNOWN'].includes(type);
}

export type FetchPaymentTermsResponse = {
  paymentTermsTemplates: gql.paymentTerms.PaymentTermsTemplateFragment.Result[];
};
