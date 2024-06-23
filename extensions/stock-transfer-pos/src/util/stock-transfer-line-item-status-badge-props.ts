import { BadgeProps, BadgeVariant } from '@shopify/retail-ui-extensions-react';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { StockTransferLineItemStatus } from '@web/services/db/queries/generated/stock-transfers.sql.js';

export function getStockTransferLineItemStatusBadgeProps(status: StockTransferLineItemStatus): BadgeProps {
  let variant: BadgeVariant = 'success';

  if (status === 'PENDING') {
    variant = 'warning';
  }

  if (status === 'IN_TRANSIT') {
    variant = 'highlight';
  }

  return {
    variant,
    text: titleCase(status),
  };
}
