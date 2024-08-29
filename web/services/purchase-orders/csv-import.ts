import { z } from 'zod';
import { zDateTime, zID, zMoney, zNamespacedID } from '../../util/zod.js';
import { PassThrough, Readable } from 'node:stream';
import { buffer } from 'node:stream/consumers';
import busboy from 'busboy';
import { IncomingHttpHeaders } from 'node:http';
import csv from 'csv-parser';
import { finished } from 'node:stream/promises';
import { CreatePurchaseOrder } from '../../schemas/generated/create-purchase-order.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { v4 as uuid } from 'uuid';
import { UUID } from '../../util/types.js';
import { never } from '@teifi-digital/shopify-app-toolbox/util';
import archiver from 'archiver';

// CSV files can't have undefined/null, so transform empty strings to null instead when making something optional
const optional = <const T extends z.ZodType>(type: T) =>
  z.preprocess(
    arg => (arg === '' ? null : arg),
    type.optional().transform(value => value ?? null),
  );

const CsvPurchaseOrderId = z
  .string()
  .min(1)
  .describe('Mandatory purchase order id used to associate it with line items');

const CsvPurchaseOrderInfo = z.object({
  ID: CsvPurchaseOrderId,
  Status: z.string(),
  PlacedDate: optional(zDateTime),
  LocationID: optional(zNamespacedID('Location')),
  VendorName: optional(z.string()),
  ShipFrom: z.string(),
  ShipTo: z.string(),
  Note: z.string(),
  Discount: optional(zMoney),
  Tax: optional(zMoney),
  Shipping: optional(zMoney),
  Deposited: optional(zMoney),
  Paid: optional(zMoney),
});

const CsvPurchaseOrderLineItemId = z
  .string()
  .min(1)
  .describe('Mandatory line item id used to associate line items with line item custom fields');

const CsvPurchaseOrderLineItem = z.object({
  PurchaseOrderID: CsvPurchaseOrderId,
  LineItemID: CsvPurchaseOrderLineItemId,
  ProductVariantID: zNamespacedID('ProductVariant'),
  Quantity: z.coerce.number().int(),
  UnitCost: zMoney,
  AvailableQuantity: z.coerce.number().int(),
});

const CsvPurchaseOrderCustomField = z.object({
  ID: CsvPurchaseOrderId,
  CustomFieldName: z.string(),
  CustomFieldValue: z.string(),
});

const CsvPurchaseOrderEmployeeAssignment = z.object({
  ID: CsvPurchaseOrderId,
  EmployeeId: zID,
});

const CsvPurchaseOrderLineItemCustomField = z.object({
  PurchaseOrderID: CsvPurchaseOrderId,
  LineItemID: CsvPurchaseOrderLineItemId,
  CustomFieldName: z.string(),
  CustomFieldValue: z.string(),
});

const FILE_SCHEMA = {
  'purchase-order-info.csv': CsvPurchaseOrderInfo,
  'line-items.csv': CsvPurchaseOrderLineItem,
  'custom-fields.csv': CsvPurchaseOrderCustomField,
  'employee-assignments.csv': CsvPurchaseOrderEmployeeAssignment,
  'line-item-custom-fields.csv': CsvPurchaseOrderLineItemCustomField,
} as const;

export type PurchaseOrderImportFileName = keyof typeof FILE_SCHEMA;

function isPurchaseOrderImportFileName(value: unknown): value is PurchaseOrderImportFileName {
  return Object.keys(FILE_SCHEMA).includes(value as PurchaseOrderImportFileName);
}

export async function readPurchaseOrderCsvImport({
  formData,
  headers,
}: {
  formData: Readable;
  headers: IncomingHttpHeaders;
}) {
  return new Promise<CreatePurchaseOrder[]>(async (resolve, reject) => {
    if (!headers['content-type']?.includes('multipart/form-data')) {
      throw new HttpError('Invalid content type', 400);
    }

    const bb = busboy({
      headers,
      limits: {
        fileSize: 5 * 2 ** 20,
        files: 5,
      },
    });

    const filePromises: Promise<void>[] = [];

    const createPurchaseOrders: Record<string, CreatePurchaseOrder> = Object.create(null);
    // map [purchase order id][line item id] to line item uuid
    const lineItemUuidMapping: Record<string, Record<string, string>> = Object.create(null);

    const handlePurchaseOrderInfo = (data: z.infer<typeof CsvPurchaseOrderInfo>) => {
      if (data.ID in createPurchaseOrders) {
        throw new HttpError('Duplicate purchase order id', 400);
      }

      createPurchaseOrders[data.ID] = {
        name: null,
        status: data.Status,
        placedDate: data.PlacedDate,
        locationId: data.LocationID,
        vendorName: data.VendorName,
        shipFrom: data.ShipFrom,
        shipTo: data.ShipTo,
        note: data.Note,
        discount: data.Discount,
        tax: data.Tax,
        shipping: data.Shipping,
        deposited: data.Deposited,
        paid: data.Paid,
        lineItems: [],
        customFields: Object.create(null),
        employeeAssignments: [],
      };
    };

    const handleLineItem = (data: z.infer<typeof CsvPurchaseOrderLineItem>) => {
      const createPurchaseOrder = createPurchaseOrders[data.PurchaseOrderID];

      if (!createPurchaseOrder) {
        throw new HttpError(`Purchase order ${data.PurchaseOrderID} not found for line item ${data.LineItemID}`, 400);
      }

      const lineItemUuid = lineItemUuidMapping[data.PurchaseOrderID]?.[data.LineItemID];

      if (lineItemUuid) {
        throw new HttpError('Duplicate purchase order line item id', 400);
      }

      createPurchaseOrder.lineItems.push({
        uuid: uuid() as UUID,
        quantity: data.Quantity,
        specialOrderLineItem: null,
        productVariantId: data.ProductVariantID,
        unitCost: data.UnitCost,
        availableQuantity: data.AvailableQuantity,
        customFields: Object.create(null),
      });
    };

    const handleCustomField = (data: z.infer<typeof CsvPurchaseOrderCustomField>) => {
      const createPurchaseOrder = createPurchaseOrders[data.ID];

      if (!createPurchaseOrder) {
        throw new HttpError(`Purchase order ${data.ID} not found for custom field ${data.CustomFieldName}`, 400);
      }

      if (data.CustomFieldName in createPurchaseOrder.customFields) {
        throw new HttpError('Duplicate purchase order custom field name', 400);
      }

      createPurchaseOrder.customFields[data.CustomFieldName] = data.CustomFieldValue;
    };

    const handleEmployeeAssignment = (data: z.infer<typeof CsvPurchaseOrderEmployeeAssignment>) => {
      const createPurchaseOrder = createPurchaseOrders[data.ID];

      if (!createPurchaseOrder) {
        throw new HttpError(`Purchase order ${data.ID} not found for employee assignment ${data.EmployeeId}`, 400);
      }

      if (createPurchaseOrder.employeeAssignments.map(ea => ea.employeeId).includes(data.EmployeeId)) {
        throw new HttpError('Duplicate purchase order employee assignment', 400);
      }

      createPurchaseOrder.employeeAssignments.push({
        employeeId: data.EmployeeId,
      });
    };

    const handleLineItemCustomField = (data: z.infer<typeof CsvPurchaseOrderLineItemCustomField>) => {
      const createPurchaseOrder = createPurchaseOrders[data.PurchaseOrderID];

      if (!createPurchaseOrder) {
        throw new HttpError(
          `Purchase order ${data.PurchaseOrderID} not found for line item ${data.LineItemID} custom field ${data.CustomFieldName}`,
          400,
        );
      }

      const lineItemUuid = lineItemUuidMapping[data.PurchaseOrderID]?.[data.LineItemID];

      if (!lineItemUuid) {
        throw new HttpError('Line item not found', 400);
      }

      const lineItem =
        createPurchaseOrder.lineItems.find(li => li.uuid === lineItemUuid) ??
        never('should be there because it is in the mapping');

      if (data.CustomFieldName in lineItem.customFields) {
        throw new HttpError('Duplicate purchase order line item custom field name', 400);
      }

      lineItem.customFields[data.CustomFieldName] = data.CustomFieldValue;
    };

    // we stream down files instantly without persisting them to disk - node/os will do necessary backpressure and buffering
    bb.on('file', async (name, stream) => {
      console.log('name', name);
      const passThrough = new PassThrough();
      passThrough.on('data', chunk => console.log(name, chunk.toString()));
      const csvStream = stream.pipe(passThrough).pipe(csv());

      filePromises.push(finished(csvStream));

      if (!isPurchaseOrderImportFileName(name)) {
        stream.resume();
        bb.destroy();
        reject(new HttpError(`Unknown file ${name}`, 400));
        return;
      }

      for await (const data of csvStream) {
        const parse = <T extends PurchaseOrderImportFileName>(fileName: T): z.infer<(typeof FILE_SCHEMA)[T]> => {
          const result = FILE_SCHEMA[fileName].safeParse(data);

          if (!result.success) {
            throw new HttpError(`${fileName} CSV file is invalid`, 400);
          }

          return result.data;
        };

        try {
          switch (name) {
            case 'purchase-order-info.csv': {
              handlePurchaseOrderInfo(parse('purchase-order-info.csv'));
              break;
            }

            case 'line-items.csv': {
              handleLineItem(parse('line-items.csv'));
              break;
            }

            case 'custom-fields.csv': {
              handleCustomField(parse('custom-fields.csv'));
              break;
            }

            case 'employee-assignments.csv': {
              handleEmployeeAssignment(parse('employee-assignments.csv'));
              break;
            }

            case 'line-item-custom-fields.csv': {
              handleLineItemCustomField(parse('line-item-custom-fields.csv'));
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
        reject(new HttpError('File is too large', 400));
        return;
      }
    });

    formData.pipe(bb);

    await finished(bb);
    await Promise.all(filePromises);

    resolve(Object.values(createPurchaseOrders));
  });
}

let purchaseOrderCsvTemplatesArchive: Buffer | null = null;

/**
 * Create a zip archive containing all csv templates based on the zod schemas.
 * The archive is cached in memory after the initial call.
 */
export async function getPurchaseOrderCsvTemplatesZip() {
  if (purchaseOrderCsvTemplatesArchive) {
    return purchaseOrderCsvTemplatesArchive;
  }

  const archive = archiver('zip');
  const archiveOutput = buffer(archive);

  for (const [fileName, fileSchema] of Object.entries(FILE_SCHEMA)) {
    archive.append(getSchemaCsvTemplate(fileSchema), { name: fileName });
  }

  await archive.finalize();

  purchaseOrderCsvTemplatesArchive = await archiveOutput;
  return purchaseOrderCsvTemplatesArchive;
}

type FileSchema = (typeof FILE_SCHEMA)[PurchaseOrderImportFileName];

function getSchemaCsvTemplate(schema: FileSchema) {
  const headers = Object.keys(schema.shape);
  const emptyLine = Array.from({ length: headers.length }, () => '');
  return [headers, emptyLine].map(cells => cells.join(',')).join('\n');
}
