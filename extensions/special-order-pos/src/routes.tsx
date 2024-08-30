import { createRouter } from '@teifi-digital/pos-tools/router';
import { ScrollView } from '@shopify/retail-ui-extensions-react';
import { ScreenPermissionBoundary } from '@work-orders/common-pos/components/ScreenPermissionBoundary.js';
import { ListPopup, ListPopupProps } from '@work-orders/common-pos/screens/ListPopup.js';
import { Entry } from './screens/Entry.js';
import { OrderStateSelector } from './screens/selectors/OrderStateSelector.js';
import { PurchaseOrderStateSelector } from './screens/selectors/PurchaseOrderStateSelector.js';
import { VendorSelector } from './screens/selectors/VendorSelector.js';
import { CustomerSelector } from './screens/selectors/CustomerSelector.js';
import { LocationSelector } from './screens/selectors/LocationSelector.js';
import { SpecialOrderLineItemConfig } from './screens/special-order/SpecialOrderLineItemConfig.js';
import { SpecialOrder } from './screens/special-order/SpecialOrder.js';
import { CompanySelector } from './screens/selectors/CompanySelector.js';
import { CompanyLocationSelector } from './screens/selectors/CompanyLocationSelector.js';

export const { Router, useRouter } = createRouter({
  Entry: {
    title: 'Special Orders',
    Component: () => (
      <ScrollView>
        <ScreenPermissionBoundary permissions={['read_special_orders']}>
          <Entry />
        </ScreenPermissionBoundary>
      </ScrollView>
    ),
  },
  SpecialOrder: {
    title: 'Special Order',
    Component: SpecialOrder,
  },
  SpecialOrderLineItemConfig: {
    title: 'Line item config',
    Component: SpecialOrderLineItemConfig,
  },
  ListPopup: {
    title: 'ListPopup',
    Component: (props: Omit<ListPopupProps, 'useRouter'>) => <ListPopup {...props} useRouter={useRouter} />,
  },
  // TODO: have ListPopup-based standard components like this all in common pos
  CustomerSelector: {
    title: 'Select Customer',
    Component: CustomerSelector,
  },
  LocationSelector: {
    title: 'Select Location',
    Component: LocationSelector,
  },
  VendorSelector: {
    title: 'Select Vendor',
    Component: VendorSelector,
  },
  OrderStateSelector: {
    title: 'Select Order State',
    Component: OrderStateSelector,
  },
  PurchaseOrderStateSelector: {
    title: 'Select Purchase Order State',
    Component: PurchaseOrderStateSelector,
  },
  CompanySelector: {
    title: 'Select Company',
    Component: CompanySelector,
  },
  CompanyLocationSelector: {
    title: 'Select Company Location',
    Component: CompanyLocationSelector,
  },
});
