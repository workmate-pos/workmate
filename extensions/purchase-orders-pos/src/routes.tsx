import { PurchaseOrder } from './screens/PurchaseOrder.js';
import { StatusSelector } from './screens/popups/StatusSelector.js';
import { VendorSelector } from './screens/popups/VendorSelector.js';
import { ScreenPermissionBoundary } from '@work-orders/common-pos/components/ScreenPermissionBoundary.js';
import { Entry } from './screens/Entry.js';
import { EmployeeSelector } from './screens/popups/EmployeeSelector.js';
import { ProductSelector } from './screens/popups/ProductSelector.js';
import { ProductConfig } from './screens/popups/ProductConfig.js';
import { createRouter } from '@teifi-digital/pos-tools/router';
import { ProductCreator, ProductCreatorProps } from '@work-orders/common-pos/screens/product-creator/ProductCreator.js';
import {
  CustomFieldConfig,
  CustomFieldConfigProps,
} from '@work-orders/common-pos/screens/custom-fields/CustomFieldConfig.js';
import { ImportPreset, ImportPresetProps } from '@work-orders/common-pos/screens/custom-fields/ImportPreset.js';
import { SavePreset, SavePresetProps } from '@work-orders/common-pos/screens/custom-fields/SavePreset.js';
import { PrintOverview } from './screens/PrintOverview.js';
import { OrderProductSelector } from './screens/popups/OrderProductSelector.js';
import { OrderSelector } from './screens/popups/OrderSelector.js';
import { ScrollView } from '@shopify/retail-ui-extensions-react';
import { LocationSelector, LocationSelectorProps } from '@work-orders/common-pos/screens/LocationSelector.js';
import {
  CustomFieldFilterConfig,
  CustomFieldFilterConfigProps,
} from '@work-orders/common-pos/screens/custom-fields/CustomFieldFilterConfig.js';

export const { Router, useRouter } = createRouter({
  Entry: {
    title: 'Purchase Orders',
    Component: () => {
      return (
        <ScrollView>
          <ScreenPermissionBoundary permissions={['read_settings', 'read_purchase_orders', 'read_employees']}>
            <Entry />
          </ScreenPermissionBoundary>
        </ScrollView>
      );
    },
  },
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
    Component: (props: Omit<CustomFieldConfigProps, 'useRouter'>) => (
      <CustomFieldConfig {...props} useRouter={useRouter} />
    ),
  },
  ImportPreset: {
    title: 'Import Preset',
    Component: (props: Omit<ImportPresetProps, 'useRouter'>) => <ImportPreset {...props} useRouter={useRouter} />,
  },
  SavePreset: {
    title: 'Save Preset',
    Component: (props: Omit<SavePresetProps, 'useRouter'>) => <SavePreset {...props} useRouter={useRouter} />,
  },
  EmployeeSelector: {
    title: 'Select Employee',
    // TODO: permission boundary here?
    Component: EmployeeSelector,
  },
  LocationSelector: {
    title: 'Select Location',
    Component: (props: Omit<LocationSelectorProps, 'useRouter'>) => (
      <LocationSelector {...props} useRouter={useRouter} />
    ),
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
    Component: (props: Omit<ProductCreatorProps, 'useRouter'>) => <ProductCreator {...props} useRouter={useRouter} />,
  },
  ProductConfig: {
    title: 'Product Config',
    Component: ProductConfig,
  },
  CustomFieldFilterConfig: {
    title: 'Custom Field Filters',
    Component: (props: Omit<CustomFieldFilterConfigProps, 'useRouter'>) => (
      <CustomFieldFilterConfig {...props} useRouter={useRouter} />
    ),
  },
  PrintOverview: {
    title: 'Print Overview',
    Component: PrintOverview,
  },
  OrderSelector: {
    title: 'Select Order',
    Component: OrderSelector,
  },
  OrderProductSelector: {
    title: 'Select Order Product',
    Component: OrderProductSelector,
  },
});
