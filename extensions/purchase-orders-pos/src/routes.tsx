import { PurchaseOrder } from './screens/PurchaseOrder.js';
import { StatusSelector } from './screens/popups/StatusSelector.js';
import { VendorSelector } from './screens/popups/VendorSelector.js';
import { ScreenPermissionBoundary } from '@work-orders/common-pos/components/ScreenPermissionBoundary.js';
import { Entry } from './screens/Entry.js';
import { CustomFieldConfig } from './screens/popups/CustomFieldConfig.js';
import { SavePreset } from './screens/popups/SavePreset.js';
import { ImportPreset } from './screens/popups/ImportPreset.js';
import { EmployeeSelector } from './screens/popups/EmployeeSelector.js';
import { LocationSelector } from './screens/popups/LocationSelector.js';
import { ProductSelector } from './screens/popups/ProductSelector.js';
import { ProductCreator } from './screens/popups/ProductCreator.js';
import { ProductConfig } from './screens/popups/ProductConfig.js';
import { createRouter } from '@teifi-digital/pos-tools/router';

export const { Router, useRouter } = createRouter(
  {
    title: 'Purchase Orders',
    Component: () => {
      return (
        <ScreenPermissionBoundary permissions={['read_settings', 'read_purchase_orders', 'read_employees']}>
          <Entry />
        </ScreenPermissionBoundary>
      );
    },
  },
  {
    PurchaseOrder: {
      title: 'Purchase Order',
      Component: PurchaseOrder,
    },
    StatusSelector: {
      title: 'Select Status',
      Component: StatusSelector,
    },
    VendorSelector: {
      title: 'Select Vendor',
      Component: VendorSelector,
    },
    CustomFieldConfig: {
      title: 'Custom Fields',
      Component: CustomFieldConfig,
    },
    SavePreset: {
      title: 'Save Preset',
      Component: SavePreset,
    },
    ImportPreset: {
      title: 'Import Preset',
      Component: ImportPreset,
    },
    EmployeeSelector: {
      title: 'Select Employee',
      // TODO: permission boundary here?
      Component: EmployeeSelector,
    },
    LocationSelector: {
      title: 'Select Location',
      Component: LocationSelector,
    },
    // TODO: Add this back, but for selecting items to add rather than for selecting a single work order (ie this will open another popup)
    // OrderSelector: {
    //   title: 'Select Order',
    //   Component: OrderSelector,
    // },
    // TODO: Add this back, but for selecting items to add rather than for selecting a single work order (ie this will open another popup)
    // WorkOrderSelector: {
    //   title: 'Select Work Order',
    //   Component: WorkOrderSelector,
    // },
    ProductSelector: {
      title: 'Select Product',
      Component: ProductSelector,
    },
    ProductCreator: {
      title: 'Create Product',
      Component: ProductCreator,
    },
    ProductConfig: {
      title: 'Product Config',
      Component: ProductConfig,
    },
  },
);
