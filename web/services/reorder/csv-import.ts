import { z } from 'zod';
import { zCsvNullable, zNamespacedID } from '../../util/zod.js';
import { IncomingHttpHeaders } from 'node:http';
import { Readable } from 'node:stream';
import { CreateReorderPoint } from '../../schemas/generated/create-reorder-point.js';
import busboy from 'busboy';
import csv from 'csv-parser';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { finished } from 'node:stream/promises';
import archiver from 'archiver';
import { buffer } from 'node:stream/consumers';
import { PurchaseOrderImportFileName } from '../purchase-orders/csv-import.js';
import { getSchemaCsvTemplate } from '../csv/csv-template.js';

const CsvReorderPoint = z.object({
  Min: z.coerce.number().int(),
  Max: z.coerce.number().int(),
  LocationID: zCsvNullable(zNamespacedID('Location')),
  InventoryItemId: zNamespacedID('InventoryItem'),
});

const FILE_SCHEMA = {
  'reorder-points.csv': CsvReorderPoint,
} as const;

export type ReorderPointImportFileName = keyof typeof FILE_SCHEMA;

function isReorderPointImportFileName(value: unknown): value is ReorderPointImportFileName {
  return Object.keys(FILE_SCHEMA).includes(value as string);
}

export async function readReorderPointCsvImport({
  formData,
  headers,
}: {
  formData: Readable;
  headers: IncomingHttpHeaders;
}) {
  return new Promise<CreateReorderPoint[]>(async (resolve, reject) => {
    const bb = busboy({
      headers,
      limits: {
        fileSize: 2 ** 20,
        files: Object.keys(FILE_SCHEMA).length,
      },
    });

    const fileFinishedPromises: Promise<void>[] = [];
    const createReorderPoints: CreateReorderPoint[] = [];
    const knownInventoryItemLocationIds = new Set<string>();

    const handleReorderPoint = (data: z.infer<typeof CsvReorderPoint>) => {
      const inventoryItemLocationId = `${data.InventoryItemId}-${data.LocationID}`;

      if (knownInventoryItemLocationIds.has(inventoryItemLocationId)) {
        throw new Error(`Duplicate inventory item - location pair (${data.InventoryItemId})`);
      }

      createReorderPoints.push({
        inventoryItemId: data.InventoryItemId,
        locationId: data.LocationID ?? undefined,
        min: data.Min,
        max: data.Max,
      });
    };

    bb.on('file', async (name, stream) => {
      const csvStream = stream.pipe(csv());

      fileFinishedPromises.push(finished(csvStream));

      if (!isReorderPointImportFileName(name)) {
        stream.resume();
        bb.destroy();
        reject(new HttpError(`Unknown file ${name}`, 400));
        return;
      }

      for await (const data of csvStream) {
        const parse = <T extends ReorderPointImportFileName>(fileName: T): z.infer<(typeof FILE_SCHEMA)[T]> => {
          const result = FILE_SCHEMA[fileName].safeParse(data);

          if (!result.success) {
            throw new HttpError(`${fileName} CSV file is invalid`, 400);
          }

          return result.data;
        };

        try {
          switch (name) {
            case 'reorder-points.csv': {
              handleReorderPoint(parse('reorder-points.csv'));
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
    });

    formData.pipe(bb);

    await finished(bb);
    await Promise.all(fileFinishedPromises);

    resolve(createReorderPoints);
  });
}

let reorderPointCsvTemplatesArchive: Buffer | null = null;

/**
 * Create a zip archive containing all csv templates based on the zod schemas.
 * The archive is cached in memory after the initial call.
 */
export async function getReorderPointCsvTemplatesZip() {
  if (reorderPointCsvTemplatesArchive) {
    return reorderPointCsvTemplatesArchive;
  }

  const archive = archiver('zip');
  const archiveOutput = buffer(archive);

  for (const [fileName, fileSchema] of Object.entries(FILE_SCHEMA)) {
    archive.append(getSchemaCsvTemplate(fileSchema), { name: fileName });
  }

  await archive.finalize();

  reorderPointCsvTemplatesArchive = await archiveOutput;
  return reorderPointCsvTemplatesArchive;
}
