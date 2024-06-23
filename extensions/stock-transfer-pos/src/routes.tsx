import { createRouter } from '@teifi-digital/pos-tools/router';
import { ScreenPermissionBoundary } from '@work-orders/common-pos/components/ScreenPermissionBoundary.js';
import { Entry } from './screens/Entry.js';
import { PermissionNode } from '@web/services/db/queries/generated/employee.sql.js';
import { StockTransfer } from './screens/StockTransfer.js';
import { ProductSelector } from './screens/popups/ProductSelector.js';
import { StockTransferLineItemConfig } from './screens/popups/StockTransferLineItemConfig.js';
import { StockTransferLineItemStatusSelector } from './screens/popups/StockTransferLineItemStatusSelector.js';
import { StockTransferLineItemScanner } from './screens/popups/StockTransferLineItemScanner.js';
import { LocationSelector, LocationSelectorProps } from '@work-orders/common-pos/screens/LocationSelector.js';
import { ExistingStockTransfer } from './screens/popups/ExistingStockTransfer.js';

const requiredPermissions: PermissionNode[] = ['read_stock_transfers'];

export const { Router, useRouter } = createRouter({
  Entry: {
    title: 'Stock Transfer',
    Component: () => (
      <ScreenPermissionBoundary permissions={requiredPermissions}>
        <Entry />
      </ScreenPermissionBoundary>
    ),
  },
  StockTransfer: {
    title: 'Stock Transfer',
    Component: StockTransfer,
  },
  ProductSelector: {
    title: 'Select Product',
    Component: ProductSelector,
  },
  StockTransferLineItemScanner: {
    title: 'Scan Items',
    Component: StockTransferLineItemScanner,
  },
  StockTransferLineItemConfig: {
    title: 'Line Item Config',
    Component: StockTransferLineItemConfig,
  },
  StockTransferLineItemStatusSelector: {
    title: 'Select Status',
    Component: StockTransferLineItemStatusSelector,
  },
  LocationSelector: {
    title: 'Select Location',
    Component: (props: Omit<LocationSelectorProps, 'useRouter'>) => (
      <LocationSelector {...props} useRouter={useRouter} />
    ),
  },
  ExistingStockTransfer: {
    title: 'Stock Transfer',
    Component: ExistingStockTransfer,
  },
});
