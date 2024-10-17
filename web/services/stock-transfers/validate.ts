import { Session } from '@shopify/shopify-api';
import { CreateStockTransfer } from '../../schemas/generated/create-stock-transfer.js';
import { assertValidUuid } from '../../util/uuid.js';
import { HttpError } from '@teifi-digital/shopify-app-express/errors';
import { getStockTransfer } from './queries.js';
import { LocalsTeifiUser } from '../../decorators/permission.js';

export async function validateCreateStockTransfer(
  session: Session,
  createStockTransfer: CreateStockTransfer,
  user: LocalsTeifiUser,
) {
  assertValidUuids(createStockTransfer);
  assertUniqueUuids(createStockTransfer);
  assertPositiveQuantities(createStockTransfer);

  await assertValidStockTransferName(session, createStockTransfer, user);
}

function assertValidUuids(createStockTransfer: CreateStockTransfer) {
  for (const { uuid } of createStockTransfer.lineItems) {
    assertValidUuid(uuid);
  }
}

function assertUniqueUuids(createStockTransfer: CreateStockTransfer) {
  const lineItemUuids = createStockTransfer.lineItems.map(li => li.uuid);
  const lineItemUuidsSet = new Set(lineItemUuids);

  if (lineItemUuidsSet.size !== lineItemUuids.length) {
    throw new HttpError('Stock transfer line items must have unique uuids', 400);
  }
}

function assertPositiveQuantities(createStockTransfer: CreateStockTransfer) {
  for (const { quantity } of createStockTransfer.lineItems) {
    if (quantity <= 0) {
      throw new HttpError('Stock transfer line items must have positive quantities', 400);
    }
  }
}

async function assertValidStockTransferName(
  session: Session,
  createStockTransfer: CreateStockTransfer,
  user: LocalsTeifiUser,
) {
  if (createStockTransfer.name) {
    const stockTransfer = await getStockTransfer({
      shop: session.shop,
      name: createStockTransfer.name,
      locationIds: user.user.allowedLocationIds,
    });

    if (!stockTransfer) {
      throw new HttpError(`Stock transfer ${createStockTransfer.name} does not exist`, 404);
    }
  }
}
