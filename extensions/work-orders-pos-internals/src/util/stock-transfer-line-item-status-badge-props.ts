import { BadgeProps, BadgeVariant } from '@shopify/ui-extensions-react/point-of-sale';
import { sentenceCase } from '@teifi-digital/shopify-app-toolbox/string';
import { StockTransferLineItemStatus } from '@web/services/db/queries/generated/stock-transfers.sql.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';

// TODO: Move to common-pos / mono-extension
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

  let variant: BadgeVariant = 'success';

  if (status === 'PENDING') {
    variant = 'warning';
  }

  if (status === 'IN_TRANSIT') {
    variant = 'highlight';
  }

  return { text, variant };
}
