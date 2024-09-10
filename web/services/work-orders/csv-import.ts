import { z } from 'zod';
import { zCsvBool, zCsvNullable, zDateTime, zDecimal, zMoney, zObjectGid } from '../../util/zod.js';
import { IncomingHttpHeaders } from 'node:http';
import { Readable } from 'node:stream';
import { CreateWorkOrder } from '../../schemas/generated/create-work-order.js';
import archiver from 'archiver';
import { buffer } from 'node:stream/consumers';
import busboy from 'busboy';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { match, P } from 'ts-pattern';
import { identity } from '@teifi-digital/shopify-app-toolbox/functional';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import { httpError } from '../../util/http-error.js';
import csv from 'csv-parser';
import { finished } from 'node:stream/promises';
import { uuid } from '@work-orders/common/util/uuid.js';
import { UUID } from '@work-orders/common/util/uuid.js';

const CsvWorkOrderId = z
  .string()
  .min(1)
  .describe('Mandatory work order id used to associate it with line items, custom fields, etc.');

const CsvWorkOrderInfo = z.object({
  ID: CsvWorkOrderId,
  Status: z.string(),
  DueDate: zDateTime,
  Note: z.string(),
  InternalNote: z.string(),
  CustomerID: zObjectGid('Customer'),
  CompanyID: zCsvNullable(zObjectGid('Company')),
  CompanyLocationID: zCsvNullable(zObjectGid('CompanyLocation')),
  CompanyContactID: zCsvNullable(zObjectGid('CompanyContact')),
  DerivedFromOrderID: zCsvNullable(zObjectGid('Order')),

  PaymentTermsTemplateID: zCsvNullable(zObjectGid('PaymentTermsTemplate')),
  PaymentTermsDate: zCsvNullable(zDateTime).describe(
    'Only required if the payment terms template requires a date, e.g. fixed date',
  ),

  DiscountType: zCsvNullable(z.union([z.literal('FIXED_AMOUNT'), z.literal('PERCENTAGE')])),
  DiscountAmount: zCsvNullable(z.union([zMoney, zDecimal])),

  SerialNumber: zCsvNullable(z.string()),
  SerialProductVariantID: zCsvNullable(zObjectGid('ProductVariant')),
});

const CsvWorkOrderInfoPaymentTerms = z
  .object({
    PaymentTermsTemplateID: zObjectGid('PaymentTermsTemplate'),
    PaymentTermsDate: zCsvNullable(zDateTime).describe(
      'Only required if the payment terms template requires a date, e.g. fixed date',
    ),
  })
  .or(
    z.object({
      PaymentTermsTemplateID: zCsvNullable(z.null()),
      PaymentTermsDate: zCsvNullable(z.null()),
    }),
  );

const CsvWorkOrderInfoDiscount = z
  .object({
    DiscountType: z.literal('FIXED_AMOUNT'),
    DiscountAmount: zMoney,
  })
  .or(
    z.object({
      DiscountType: z.literal('PERCENTAGE'),
      DiscountAmount: zDecimal,
    }),
  )
  .or(
    z.object({
      DiscountType: zCsvNullable(z.null()),
      DiscountAmount: zCsvNullable(z.null()),
    }),
  );

const CsvWorkOrderInfoSerial = z
  .object({
    SerialNumber: z.string(),
    SerialProductVariantID: zObjectGid('ProductVariant'),
  })
  .or(
    z.object({
      SerialNumber: zCsvNullable(z.null()),
      SerialProductVariantID: zCsvNullable(z.null()),
    }),
  );

const CsvWorkOrderLineItemId = z
  .string()
  .min(1)
  .describe('Mandatory line item id used to associate line items with line item custom fields');

const CsvWorkOrderLineItem = z.object({
  WorkOrderID: CsvWorkOrderId,
  LineItemID: CsvWorkOrderLineItemId,
  Quantity: z.coerce.number().int(),
  AbsorbCharges: zCsvBool,

  Type: z.union([z.literal('PRODUCT'), z.literal('CUSTOM-ITEM')]),
  ProductVariantID: zCsvNullable(zObjectGid('ProductVariant')),
  Name: zCsvNullable(z.string().min(1)),
  UnitPrice: zCsvNullable(zMoney),
});

const CsvWorkOrderLineItemProduct = z.object({
  Type: z.literal('PRODUCT'),
  ProductVariantID: zObjectGid('ProductVariant'),
});

const CsvWorkOrderLineItemCustomItem = z.object({
  Type: z.literal('CUSTOM-ITEM'),
  Name: z.string().min(1),
  UnitPrice: zMoney,
});

const CsvWorkOrderCharge = z.object({
  WorkOrderID: CsvWorkOrderId,
  ChargeID: CsvWorkOrderLineItemId,
  LineItemID: zCsvNullable(CsvWorkOrderLineItemId),
  EmployeeID: zCsvNullable(zObjectGid('Employee')),
  Name: z.string().min(1),
  CanRemove: zCsvBool,

  Type: z.union([z.literal('FIXED-PRICE-LABOUR'), z.literal('HOURLY-LABOUR')]),
  Rate: zCsvNullable(zMoney),
  Hours: zCsvNullable(zDecimal),
  CanChangeRate: zCsvNullable(zCsvBool),
  CanChangeHours: zCsvNullable(zCsvBool),
  Amount: zCsvNullable(zMoney),
  CanChangeAmount: zCsvNullable(zCsvBool),
});

const CsvWorkOrderHourlyLabourCharge = z.object({
  WorkOrderID: CsvWorkOrderId,
  ChargeID: CsvWorkOrderLineItemId,
  LineItemID: zCsvNullable(CsvWorkOrderLineItemId),
  Type: z.literal('HOURLY-LABOUR'),
  EmployeeID: zCsvNullable(zObjectGid('Employee')),
  Name: z.string().min(1),
  Rate: zMoney,
  Hours: zDecimal,
  CanChangeRate: zCsvBool,
  CanChangeHours: zCsvBool,
  CanRemove: zCsvBool,
});

const CsvWorkOrderFixedPriceLabourCharge = z.object({
  WorkOrderID: CsvWorkOrderId,
  ChargeID: CsvWorkOrderLineItemId,
  LineItemID: zCsvNullable(CsvWorkOrderLineItemId),
  Type: z.literal('FIXED-PRICE-LABOUR'),
  EmployeeID: zCsvNullable(zObjectGid('Employee')),
  Name: z.string().min(1),
  Amount: zMoney,
  CanChangeAmount: zCsvBool,
  CanRemove: zCsvBool,
});

const CsvWorkOrderCustomField = z.object({
  WorkOrderID: CsvWorkOrderId,
  CustomFieldName: z.string(),
  CustomFieldValue: z.string(),
});

const CsvWorkOrderLineItemCustomField = z.object({
  WorkOrderID: CsvWorkOrderId,
  LineItemID: CsvWorkOrderLineItemId,
  CustomFieldName: z.string(),
  CustomFieldValue: z.string(),
});

const FILE_SCHEMA = {
  'work-order-info.csv': CsvWorkOrderInfo,
  'work-order-line-items.csv': CsvWorkOrderLineItem,
  'work-order-charges.csv': CsvWorkOrderCharge,
  'work-order-custom-fields.csv': CsvWorkOrderCustomField,
  'work-order-line-item-custom-fields.csv': CsvWorkOrderLineItemCustomField,
};

export type WorkOrderImportFileName = keyof typeof FILE_SCHEMA;

function isWorkOrderImportFileName(value: unknown): value is WorkOrderImportFileName {
  return Object.keys(FILE_SCHEMA).includes(value as WorkOrderImportFileName);
}

export async function readWorkOrderCsvImport({
  formData,
  headers,
}: {
  formData: Readable;
  headers: IncomingHttpHeaders;
}) {
  return new Promise<CreateWorkOrder[]>(async (resolve, reject) => {
    const bb = busboy({
      headers,
      limits: {
        fileSize: 5 * 2 ** 20,
        files: Object.keys(FILE_SCHEMA).length,
      },
    });

    const fileFinishedPromises: Promise<void>[] = [];

    const createWorkOrders: Record<string, CreateWorkOrder> = Object.create(null);
    // map [work order id][line item id] to line item uuid
    const lineItemUuidMapping: Record<string, Record<string, UUID>> = Object.create(null);
    // map [work order id][charge id] to charge uuid
    const chargeUuidMapping: Record<string, Record<string, UUID>> = Object.create(null);

    const handleWorkOrderInfo = (data: z.infer<typeof CsvWorkOrderInfo>) => {
      if (data.ID in createWorkOrders) {
        throw new HttpError('Duplicate work order id', 400);
      }

      const paymentTerms = CsvWorkOrderInfoPaymentTerms.safeParse(data);
      const discount = CsvWorkOrderInfoDiscount.safeParse(data);
      const serial = CsvWorkOrderInfoSerial.safeParse(data);

      if (!paymentTerms.success) {
        throw new HttpError(`Invalid payment terms for work order ${data.ID}`, 400);
      }

      if (!discount.success) {
        throw new HttpError(`Invalid discount for work order ${data.ID}`, 400);
      }

      if (!serial.success) {
        throw new HttpError(`Invalid serial for work order ${data.ID}`, 400);
      }

      createWorkOrders[data.ID] = {
        name: null,
        status: data.Status,
        dueDate: data.DueDate,
        note: data.Note,
        internalNote: data.InternalNote,
        customerId: data.CustomerID,
        companyId: data.CompanyID,
        companyLocationId: data.CompanyLocationID,
        companyContactId: data.CompanyContactID,
        derivedFromOrderId: data.DerivedFromOrderID,
        paymentTerms: paymentTerms.data.PaymentTermsTemplateID
          ? {
              templateId: paymentTerms.data.PaymentTermsTemplateID,
              date: paymentTerms.data.PaymentTermsDate,
            }
          : null,
        serial: match(serial.data)
          .returnType<CreateWorkOrder['serial']>()
          .with({ SerialNumber: null, SerialProductVariantID: null }, () => null)
          .with({ SerialNumber: P.select('serial'), SerialProductVariantID: P.select('productVariantId') }, identity)
          .exhaustive(),
        discount: match(discount.data)
          .returnType<CreateWorkOrder['discount']>()
          .with({ DiscountType: P.select('type', 'FIXED_AMOUNT'), DiscountAmount: P.select('value') }, identity)
          .with({ DiscountType: P.select('type', 'PERCENTAGE'), DiscountAmount: P.select('value') }, identity)
          .with({ DiscountType: null }, () => null)
          .exhaustive(),
        charges: [],
        items: [],
        customFields: {},
      };
    };

    const handleLineItem = (data: z.infer<typeof CsvWorkOrderLineItem>) => {
      const createWorkOrder = createWorkOrders[data.WorkOrderID];

      if (!createWorkOrder) {
        throw new HttpError(`Work order ${data.WorkOrderID} not found for line item ${data.LineItemID}`, 400);
      }

      const lineItemUuid = lineItemUuidMapping[data.WorkOrderID]?.[data.LineItemID] ?? never();

      if (lineItemUuid) {
        throw new HttpError(`Duplicate line item id ${data.LineItemID} for work order ${data.WorkOrderID}`, 400);
      }

      const base = {
        uuid: uuid(),
        quantity: data.Quantity,
        customFields: {},
        absorbCharges: data.AbsorbCharges,
      } satisfies Partial<CreateWorkOrder['items'][number]>;

      const product = CsvWorkOrderLineItemProduct.safeParse(data);
      const customItem = CsvWorkOrderLineItemCustomItem.safeParse(data);

      (lineItemUuidMapping[data.WorkOrderID] ??= {})[data.LineItemID] == base.uuid;

      createWorkOrder.items.push(
        match({ product, customItem })
          .returnType<CreateWorkOrder['items'][number]>()
          .with({ product: { success: true, data: P.select() } }, data => ({
            ...base,
            type: 'product',
            productVariantId: data.ProductVariantID,
          }))
          .with({ customItem: { success: true, data: P.select() } }, data => ({
            ...base,
            type: 'custom-item',
            name: data.Name,
            unitPrice: data.UnitPrice,
          }))
          .otherwise(() => httpError(`Invalid line item ${data.LineItemID} for work order ${data.WorkOrderID}`)),
      );
    };

    const handleCharge = (data: z.infer<typeof CsvWorkOrderCharge>) => {
      const createWorkOrder = createWorkOrders[data.WorkOrderID];

      if (!createWorkOrder) {
        throw new HttpError(`Work order ${data.WorkOrderID} not found for charge ${data.ChargeID}`, 400);
      }
      const chargeUuid = chargeUuidMapping[data.WorkOrderID]?.[data.ChargeID];

      if (chargeUuid) {
        throw new HttpError(`Duplicate charge id ${data.ChargeID} for work order ${data.WorkOrderID}`, 400);
      }

      let workOrderItemUuid: UUID | null = null;

      if (data.LineItemID) {
        workOrderItemUuid = lineItemUuidMapping[data.WorkOrderID]?.[data.LineItemID] ?? null;

        if (!createWorkOrder.items.some(item => item.uuid === workOrderItemUuid)) {
          throw new HttpError(
            `Line item ${data.LineItemID} not found for charge ${data.ChargeID} for work order ${data.WorkOrderID}`,
            400,
          );
        }
      }

      const base = {
        uuid: uuid(),
        name: data.Name,
        removeLocked: !data.CanRemove,
        workOrderItemUuid,
        employeeId: data.EmployeeID,
      } satisfies Partial<CreateWorkOrder['charges'][number]>;

      const fixedPriceLabour = CsvWorkOrderFixedPriceLabourCharge.safeParse(data);
      const hourlyLabour = CsvWorkOrderHourlyLabourCharge.safeParse(data);

      (chargeUuidMapping[data.WorkOrderID] ??= {})[data.ChargeID] = base.uuid;

      createWorkOrder.charges.push(
        match({ fixedPriceLabour, hourlyLabour })
          .returnType<CreateWorkOrder['charges'][number]>()
          .with({ fixedPriceLabour: { success: true, data: P.select() } }, data => ({
            ...base,
            type: 'fixed-price-labour',
            amount: data.Amount,
            amountLocked: !data.CanChangeAmount,
          }))
          .with({ hourlyLabour: { success: true, data: P.select() } }, data => ({
            ...base,
            type: 'hourly-labour',
            rate: data.Rate,
            hours: data.Hours,
            rateLocked: !data.CanChangeRate,
            hoursLocked: !data.CanChangeHours,
          }))
          .otherwise(() => httpError(`Invalid charge ${data.ChargeID} for work order ${data.WorkOrderID}`)),
      );
    };

    const handleCustomField = (data: z.infer<typeof CsvWorkOrderCustomField>) => {
      const createWorkOrder = createWorkOrders[data.WorkOrderID];

      if (!createWorkOrder) {
        throw new HttpError(`Work order ${data.WorkOrderID} not found for custom field ${data.CustomFieldName}`, 400);
      }

      if (data.CustomFieldName in createWorkOrder.customFields) {
        throw new HttpError(
          `Duplicate custom field name ${data.CustomFieldName} for work order ${data.WorkOrderID}`,
          400,
        );
      }

      createWorkOrder.customFields[data.CustomFieldName] = data.CustomFieldValue;
    };

    const handleLineItemCustomField = (data: z.infer<typeof CsvWorkOrderLineItemCustomField>) => {
      const createWorkOrder = createWorkOrders[data.WorkOrderID];

      if (!createWorkOrder) {
        throw new HttpError(`Work order ${data.WorkOrderID} not found for custom field ${data.CustomFieldName}`, 400);
      }

      const lineItemUuid = lineItemUuidMapping[data.WorkOrderID]?.[data.LineItemID];

      if (!lineItemUuid) {
        throw new HttpError(
          `Line item ${data.LineItemID} not found for custom field ${data.CustomFieldName} for work order ${data.WorkOrderID}`,
          400,
        );
      }

      const lineItem =
        createWorkOrder.items.find(item => item.uuid === lineItemUuid) ??
        never('there should be a line item because it is in the line item mapping');

      if (data.CustomFieldName in lineItem.customFields) {
        throw new HttpError(
          `Duplicate custom field name ${data.CustomFieldName} for work order ${data.WorkOrderID}`,
          400,
        );
      }

      lineItem.customFields[data.CustomFieldName] = data.CustomFieldValue;
    };

    bb.on('file', async (name, stream) => {
      const csvStream = stream.pipe(csv());

      fileFinishedPromises.push(finished(csvStream));

      if (!isWorkOrderImportFileName(name)) {
        stream.resume();
        bb.destroy();
        reject(new HttpError(`Unknown file ${name}`, 400));
        return;
      }

      for await (const data of csvStream) {
        const parse = <T extends WorkOrderImportFileName>(fileName: T): z.infer<(typeof FILE_SCHEMA)[T]> => {
          const result = FILE_SCHEMA[fileName].safeParse(data);

          if (!result.success) {
            throw new HttpError(`Invalid ${fileName} file`, 400);
          }

          return result.data;
        };

        try {
          switch (name) {
            case 'work-order-info.csv': {
              handleWorkOrderInfo(parse('work-order-info.csv'));
              break;
            }

            case 'work-order-line-items.csv': {
              handleLineItem(parse('work-order-line-items.csv'));
              break;
            }

            case 'work-order-charges.csv': {
              handleCharge(parse('work-order-charges.csv'));
              break;
            }

            case 'work-order-custom-fields.csv': {
              handleCustomField(parse('work-order-custom-fields.csv'));
              break;
            }

            case 'work-order-line-item-custom-fields.csv': {
              handleLineItemCustomField(parse('work-order-line-item-custom-fields.csv'));
              break;
            }

            default: {
              return name satisfies never;
            }
          }
        } catch (e) {
          bb.destroy();
          reject(e);
          return;
        }
      }

      if (stream.truncated) {
        bb.destroy();
        reject(new HttpError(`File is too large`, 400));
        return;
      }
    });

    formData.pipe(bb);
    await Promise.all(fileFinishedPromises);

    resolve(Object.values(createWorkOrders));
  });
}

let workOrderCsvTemplatesArchive: Buffer | null = null;

export async function getWorkOrderCsvTemplatesZip() {
  if (workOrderCsvTemplatesArchive) {
    return workOrderCsvTemplatesArchive;
  }

  const archive = archiver('zip');
  const archiveOutput = buffer(archive);

  for (const [fileName, fileSchema] of Object.entries(FILE_SCHEMA)) {
    archive.append(getSchemaCsvTemplate(fileSchema), { name: fileName });
  }

  await archive.finalize();

  workOrderCsvTemplatesArchive = await archiveOutput;
  return workOrderCsvTemplatesArchive;
}

type FileSchema = (typeof FILE_SCHEMA)[WorkOrderImportFileName];

function getSchemaCsvTemplate(schema: FileSchema) {
  const headers = Object.keys(schema.shape);
  const emptyLine = Array.from({ length: headers.length }, () => '');
  return [headers, emptyLine].map(cells => cells.join(',')).join('\n');
}
