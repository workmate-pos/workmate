import { sentenceCase } from '@teifi-digital/shopify-app-toolbox/string';
import { StockTransferLineItemStatus } from '@web/services/db/queries/generated/stock-transfers.sql.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { BadgeProps } from '@shopify/polaris';
import { Tone } from '@shopify/polaris/build/ts/src/components/Badge/types.js';

export function getStockTransferLineItemStatusBadgeProps({
  status,
  quantity,
  name,
}: {
  status: StockTransferLineItemStatus;
  quantity?: number;
  name?: string;
}): BadgeProps {
  const text = [name, quantity, sentenceCase(status)].filter(isNonNullable).join(' • ');

  let tone: Tone = 'success';

  if (status === 'PENDING') {
    tone = 'warning';
  }

  if (status === 'IN_TRANSIT') {
    tone = 'info';
  }

  return { children: text, tone };
}
