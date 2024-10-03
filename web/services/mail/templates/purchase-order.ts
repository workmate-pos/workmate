import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { getDetailedPurchaseOrder } from '../../purchase-orders/get.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { Liquid } from 'liquidjs';
import { awaitNested } from '@teifi-digital/shopify-app-toolbox/promise';
import { getVendors } from '../../vendors/get.js';
import { Session } from '@shopify/shopify-api';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { ShopSettings } from '../../settings/schema.js';

export async function getRenderedPurchaseOrderTemplate(
  printTemplate: ShopSettings['purchaseOrderPrintTemplates'][string],
  context: PurchaseOrderTemplateData,
) {
  const { template, subject } = printTemplate;

  const liquid = new Liquid();

  return await awaitNested({
    subject: liquid.render(liquid.parse(subject), context),
    html: liquid.render(liquid.parse(template), context),
  });
}

export type PurchaseOrderTemplateData = {
  name: string;
  /**
   * Date provided/formatted by clients.
   */
  date: string;
  shipFrom: string | null;
  shipTo: string | null;
  locationName: string | null;
  /**
   * TODO: Remove in the future
   */
  vendorName: string | null;
  vendor: {
    name: string;
    metafields: Record<string, string>;
  } | null;
  note: string;
  discount: string | null;
  tax: string | null;
  shipping: string | null;
  deposited: string | null;
  paid: string | null;
  status: string;
  lineItems: PurchaseOrderLineItemTemplateData[];
  customFields: Record<string, string>;
};

export type PurchaseOrderLineItemTemplateData = {
  name: string;
  description: string;
  unitCost: string;
  quantity: number;
  totalCost: string;
};

export async function getPurchaseOrderTemplateData(
  session: Session,
  purchaseOrderName: string,
  clientDate: string,
): Promise<PurchaseOrderTemplateData> {
  const { shop } = session;

  const [purchaseOrder, vendors] = await Promise.all([
    getDetailedPurchaseOrder({ shop }, purchaseOrderName),
    getVendors(session),
  ]);

  if (!purchaseOrder) {
    throw new HttpError('Purchase order not found', 404);
  }

  return {
    name: purchaseOrderName,
    date: clientDate,
    shipFrom: purchaseOrder.shipFrom,
    shipTo: purchaseOrder.shipTo,
    locationName: purchaseOrder.location?.name ?? null,
    vendorName: purchaseOrder.vendorName,
    vendor: purchaseOrder.vendorName
      ? {
          name: purchaseOrder.vendorName,
          metafields: Object.fromEntries(
            vendors
              .find(vendor => vendor.name === purchaseOrder.vendorName)
              ?.customer?.metafields?.nodes?.map(({ namespace, key, value }) => [`${namespace}.${key}`, value]) ?? [],
          ),
        }
      : null,
    note: purchaseOrder.note,
    discount: purchaseOrder.discount,
    tax: purchaseOrder.tax,
    shipping: purchaseOrder.shipping,
    deposited: purchaseOrder.deposited,
    paid: purchaseOrder.paid,
    status: purchaseOrder.status,
    customFields: purchaseOrder.customFields,
    lineItems: purchaseOrder.lineItems.map(lineItem => {
      const totalCost = BigDecimal.fromString(lineItem.unitCost)
        .multiply(BigDecimal.fromString(lineItem.quantity.toFixed(0)))
        .toString();
      return {
        name: getProductVariantName(lineItem.productVariant) ?? never('fk'),
        description: lineItem.productVariant.product.description,
        quantity: lineItem.quantity,
        unitCost: lineItem.unitCost,
        totalCost,
      };
    }),
  };
}
