import { Notification } from './strategies/strategy.js';
import { sql } from '../db/sql-tag.js';
import { MergeUnion } from '../../util/types.js';
import { UUID } from '@work-orders/common/util/uuid.js';
import { escapeLike } from '../db/like.js';

export async function upsertNotification({
  failed,
  notification,
  type,
  externalId,
}: {
  type: string;
  failed: boolean;
  notification: Notification;
  externalId: string | null;
}) {
  await sql`
    INSERT INTO "Notification" (uuid, shop, type, recipient, message, failed, "externalId")
    VALUES (${notification.uuid},
            ${notification.shop},
            ${type},
            ${notification.recipient},
            ${notification.message},
            ${failed},
            ${externalId})
    ON CONFLICT (uuid) DO UPDATE
      SET shop         = EXCLUDED.shop,
          type         = EXCLUDED.type,
          recipient    = EXCLUDED.recipient,
          message      = EXCLUDED.message,
          failed       = EXCLUDED.failed,
          "externalId" = EXCLUDED."externalId";
  `;
}

export async function getNotifications({
  uuid,
  externalId,
  recipient,
  shop,
  failed,
  type,
  orderBy = 'updated-at',
  order = 'descending',
  limit,
  offset = 0,
  query,
}: MergeUnion<{ uuid: string } | { externalId: string } | { shop: string }> & {
  orderBy?: 'updated-at' | 'created-at';
  order?: 'ascending' | 'descending';
  limit?: number;
  offset?: number;
  query?: string;
  type?: string;
  recipient?: string;
  failed?: boolean;
}) {
  const _limit = limit ? limit + 1 : null;
  const _query = query ? `%${escapeLike(query)}%` : undefined;

  const notifications = await sql<{
    uuid: UUID;
    shop: string;
    type: string;
    recipient: string;
    message: string;
    failed: boolean;
    externalId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>`
    SELECT *
    FROM "Notification" n
    WHERE n.uuid :: text = COALESCE(${uuid ?? null}, n.uuid :: text)
      AND n."externalId" = COALESCE(${externalId ?? null}, n."externalId")
      AND n.recipient = COALESCE(${recipient ?? null}, n.recipient)
      AND n.shop = COALESCE(${shop ?? null}, n.shop)
      AND n.failed = COALESCE(${failed ?? null}, n.failed)
      AND n.type = COALESCE(${type ?? null}, n.type)
      AND (
      n.uuid :: text ILIKE COALESCE(${_query ?? null}, n.uuid :: text) OR
      n.recipient ILIKE COALESCE(${_query ?? null}, n.recipient) OR
      n.message ILIKE COALESCE(${_query ?? null}, n.message) OR
      n.type ILIKE COALESCE(${_query ?? null}, n.type)
      )
    ORDER BY CASE WHEN ${order} = 'ascending' AND ${orderBy} = 'updated-at' THEN n."updatedAt" END ASC NULLS LAST,
             CASE WHEN ${order} = 'descending' AND ${orderBy} = 'updated-at' THEN n."updatedAt" END DESC NULLS LAST,
             --
             CASE WHEN ${order} = 'ascending' AND ${orderBy} = 'created-at' THEN n."createdAt" END ASC NULLS LAST,
             CASE WHEN ${order} = 'descending' AND ${orderBy} = 'created-at' THEN n."createdAt" END DESC NULLS LAST
    LIMIT ${_limit} OFFSET ${offset ?? 0};
  `;

  return {
    notifications: notifications.slice(0, limit),
    hasNextPage: !!limit && notifications.length > limit,
  };
}
