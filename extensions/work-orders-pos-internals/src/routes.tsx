import { StatusSelector } from './screens/popups/StatusSelector.js';
import { ScreenPermissionBoundary } from '@work-orders/common-pos/components/ScreenPermissionBoundary.js';
import { Entry } from './screens/Entry.js';
import { ProductSelector } from './screens/popups/ProductSelector.js';
import { createRouter } from '@teifi-digital/pos-tools/router';
import { OrderPreview } from './screens/popups/OrderPreview.js';
import { WorkOrderSaved } from './screens/popups/WorkOrderSaved.js';
import { ServiceSelector } from './screens/popups/ServiceSelector.js';
import { ItemConfig } from './screens/popups/ItemConfig.js';
import { EmployeeLabourConfig } from './screens/popups/EmployeeLabourConfig.js';
import { ItemChargeConfig } from './screens/popups/ItemChargeConfig.js';
import { WorkOrder } from './screens/WorkOrder.js';
import { ImportOrderSelector } from './screens/ImportOrderSelector.js';
import { PaymentOverview } from './screens/popups/PaymentOverview.js';
import {
  CustomFieldConfig,
  CustomFieldConfigProps,
} from '@work-orders/common-pos/screens/custom-fields/CustomFieldConfig.js';
import { SavePreset, SavePresetProps } from '@work-orders/common-pos/screens/custom-fields/SavePreset.js';
import { ProductCreator, ProductCreatorProps } from '@work-orders/common-pos/screens/product-creator/ProductCreator.js';
import { WorkOrderPrintOverview } from './screens/popups/WorkOrderPrintOverview.js';
import {
  CustomFieldFilterConfig,
  CustomFieldFilterConfigProps,
} from '@work-orders/common-pos/screens/custom-fields/CustomFieldFilterConfig.js';
import { DiscountSelector } from './screens/popups/DiscountSelector.js';
import { PaymentStatusSelector } from './screens/popups/PaymentStatusSelector.js';
import { OverdueStatusSelector } from './screens/popups/OverdueStatusSelector.js';
import { PurchaseOrderStatusSelector } from './screens/popups/PurchaseOrderStatusSelector.js';
import { ItemSelector } from './screens/popups/ItemSelector.js';
import { NewWorkOrder } from './screens/NewWorkOrder.js';
import { EditPreset, EditPresetProps } from '@work-orders/common-pos/screens/custom-fields/EditPreset.js';
import {
  SelectPresetToEdit,
  SelectPresetToEditProps,
} from '@work-orders/common-pos/screens/custom-fields/SelectPresetToEdit.js';
import { SelectPreset, SelectPresetProps } from '@work-orders/common-pos/screens/custom-fields/SelectPreset.js';
import { WorkOrderFilters } from './screens/popups/WorkOrderFilters.js';
import { PaymentTermsSelector } from './screens/popups/PaymentTermsSelector.js';
import {
  CustomFieldValuesConfig,
  CustomFieldValuesConfigProps,
} from '@work-orders/common-pos/screens/custom-fields/CustomFieldValuesConfig.js';
import { PermissionBoundary } from '@work-orders/common-pos/components/PermissionBoundary.js';
import { WorkOrderItemSourcing } from './screens/popups/WorkOrderItemSourcing.js';
import { WorkOrderItemSourcingHelp } from './screens/popups/WorkOrderItemSourcingHelp.js';
import { WorkOrderItemSourcingItem } from './screens/popups/WorkOrderItemSourcingItem.js';
import { StockTransferEntry } from './screens/StockTransferEntry.js';
import { StockTransfer } from './screens/StockTransfer.js';
import { StockTransferProductSelector } from './screens/popups/StockTransferProductSelector.js';
import { StockTransferLineItemScanner } from './screens/popups/StockTransferLineItemScanner.js';
import { StockTransferLineItemConfig } from './screens/popups/StockTransferLineItemConfig.js';
import { StockTransferLineItemStatusSelector } from './screens/popups/StockTransferLineItemStatusSelector.js';
import { ExistingStockTransfer } from './screens/popups/ExistingStockTransfer.js';
import { PurchaseOrderEntry } from './screens/PurchaseOrderEntry.js';
import { PurchaseOrder } from './screens/PurchaseOrder.js';
import { PurchaseOrderVendorSelector } from './screens/popups/PurchaseOrderVendorSelector.js';
import { PurchaseOrderEmployeeSelector } from './screens/popups/PurchaseOrderEmployeeSelector.js';
import { PurchaseOrderProductSelector } from './screens/popups/PurchaseOrderProductSelector.js';
import { PurchaseOrderProductConfig } from './screens/popups/PurchaseOrderProductConfig.js';
import { PurchaseOrderPrintOverview } from './screens/PurchaseOrderPrintOverview.js';
import { PurchaseOrderOrderSelector } from './screens/popups/PurchaseOrderOrderSelector.js';
import { PurchaseOrderFilterStatusSelector } from './screens/popups/PurchaseOrderFilterStatusSelector.js';
import { CreateTransferOrderForLocation } from './screens/popups/CreateTransferOrderForLocation.js';
import { QuantityAdjustmentList } from './screens/popups/QuantityAdjustmentList.js';
import { UnsourcedItemList } from './screens/popups/UnsourcedItemList.js';
import { SelectPurchaseOrderProductsToTransfer } from './screens/popups/SelectPurchaseOrderProductsToTransfer.js';
import { CreateSpecialOrderList } from './screens/popups/CreateSpecialOrderList.js';
import { CreatePurchaseOrderSpecialOrderSelector } from './screens/purchase-order/CreatePurchaseOrderSpecialOrderSelector.js';
import { ListPopup, ListPopupProps } from '@work-orders/common-pos/screens/ListPopup.js';
import {
  CompanyLocationSelector,
  CompanyLocationSelectorProps,
} from '@work-orders/common-pos/screens/selector/CompanyLocationSelector.js';
import { CompanySelector, CompanySelectorProps } from '@work-orders/common-pos/screens/selector/CompanySelector.js';
import { LocationSelector, LocationSelectorProps } from '@work-orders/common-pos/screens/selector/LocationSelector.js';
import { CustomerSelector, CustomerSelectorProps } from '@work-orders/common-pos/screens/selector/CustomerSelector.js';
import {
  MultiLocationSelector,
  MultiLocationSelectorProps,
} from '@work-orders/common-pos/screens/selector/MultiLocationSelector.js';
import {
  MultiEmployeeSelector,
  MultiEmployeeSelectorProps,
} from '@work-orders/common-pos/screens/selector/MultiEmployeeSelector.js';
import { EmployeeSelector, EmployeeSelectorProps } from '@work-orders/common-pos/screens/selector/EmployeeSelector.js';
import { VendorSelector, VendorSelectorProps } from '@work-orders/common-pos/screens/selector/VendorSelector.js';
import {
  NotFullyOrderedSpecialOrderVendorSelector,
  NotFullyOrderedSpecialOrderVendorSelectorProps,
} from '@work-orders/common-pos/screens/selector/NotFullyOrderedSpecialOrderVendorSelector.js';
import {
  SpecialOrderSelector,
  SpecialOrderSelectorProps,
} from '@work-orders/common-pos/screens/selector/SpecialOrderSelector.js';
import {
  MultiSpecialOrderLineItemSelector,
  MultiSpecialOrderLineItemSelectorProps,
} from '@work-orders/common-pos/screens/selector/MultiSpecialOrderLineItemSelector.js';
import { SerialsList } from './screens/serials/SerialsList.js';
import { SerialsFilters } from './screens/serials/SerialsFilters.js';
import { Serial } from './screens/serials/Serial.js';
import {
  ProductVariantSelector,
  ProductVariantSelectorProps,
} from '@work-orders/common-pos/screens/selector/ProductVariantSelector.js';
import { WorkOrderLoader } from './screens/work-order/WorkOrderLoader.js';
import { PurchaseOrderLoader } from './screens/purchase-order/PurchaseOrderLoader.js';
import { SerialSelector, SerialSelectorProps } from '@work-orders/common-pos/screens/selector/SerialSelector.js';
import { Scanner } from './screens/smart-scanner/Scanner.js';
import { ScrollView } from '@shopify/ui-extensions-react/point-of-sale';
import { Permission } from '@web/services/permissions/permissions.js';

const requiredPermissions: Permission[] = ['read_settings', 'read_work_orders', 'read_employees'];

export const { Router, useRouter } = createRouter({
  Entry: {
    title: 'Work orders',
    Component: () => (
      <ScreenPermissionBoundary permissions={requiredPermissions}>
        <Entry />
      </ScreenPermissionBoundary>
    ),
  },
  WorkOrderFilters: {
    title: 'Filters',
    Component: WorkOrderFilters,
  },
  WorkOrder: {
    title: 'Work order',
    Component: WorkOrder,
  },
  WorkOrderLoader: {
    title: 'Work order',
    Component: WorkOrderLoader,
  },
  NewWorkOrder: {
    title: 'New work order',
    Component: () => (
      <ScreenPermissionBoundary permissions={requiredPermissions}>
        <NewWorkOrder />
      </ScreenPermissionBoundary>
    ),
  },
  EmployeeSelector: {
    title: 'Select employee',
    Component: (props: Omit<EmployeeSelectorProps, 'useRouter'>) => (
      <EmployeeSelector {...props} useRouter={useRouter} />
    ),
  },
  ProductSelector: {
    title: 'Select product',
    Component: ProductSelector,
  },
  OrderPreview: {
    title: 'Select product',
    Component: OrderPreview,
  },
  StatusSelector: {
    title: 'Select status',
    Component: StatusSelector,
  },
  PaymentStatusSelector: {
    title: 'Select payment status',
    Component: PaymentStatusSelector,
  },
  OverdueStatusSelector: {
    title: 'Select overdue status',
    Component: OverdueStatusSelector,
  },
  PurchaseOrderStatusSelector: {
    title: 'Select purchase order status',
    Component: PurchaseOrderStatusSelector,
  },
  CustomerSelector: {
    title: 'Select customer',
    Component: (props: Omit<CustomerSelectorProps, 'useRouter'>) => (
      <CustomerSelector {...props} useRouter={useRouter} />
    ),
  },
  CompanySelector: {
    title: 'Select company',
    Component: (props: Omit<CompanySelectorProps, 'useRouter'>) => <CompanySelector {...props} useRouter={useRouter} />,
  },
  CompanyLocationSelector: {
    title: 'Select company location',
    Component: (props: Omit<CompanyLocationSelectorProps, 'useRouter'>) => (
      <CompanyLocationSelector {...props} useRouter={useRouter} />
    ),
  },
  LocationSelector: {
    title: 'Select location',
    Component: (props: Omit<LocationSelectorProps, 'useRouter'>) => (
      <LocationSelector {...props} useRouter={useRouter} />
    ),
  },
  MultiLocationSelector: {
    title: 'Select locations',
    Component: (props: Omit<MultiLocationSelectorProps, 'useRouter'>) => (
      <MultiLocationSelector {...props} useRouter={useRouter} />
    ),
  },
  VendorSelector: {
    title: 'Select vendor',
    Component: (props: Omit<VendorSelectorProps, 'useRouter'>) => <VendorSelector {...props} useRouter={useRouter} />,
  },
  NotFullyOrderedSpecialOrderVendorSelector: {
    title: 'Select vendor',
    Component: (props: Omit<NotFullyOrderedSpecialOrderVendorSelectorProps, 'useRouter'>) => (
      <NotFullyOrderedSpecialOrderVendorSelector {...props} useRouter={useRouter} />
    ),
  },
  DiscountSelector: {
    title: 'Select discount',
    Component: DiscountSelector,
  },
  WorkOrderSaved: {
    title: 'Work order saved',
    Component: WorkOrderSaved,
  },
  ServiceSelector: {
    title: 'Select service',
    Component: ServiceSelector,
  },
  ItemConfig: {
    title: 'Line item config',
    Component: ItemConfig,
  },
  EmployeeLabourConfig: {
    title: 'Employee config',
    Component: EmployeeLabourConfig,
  },
  ItemChargeConfig: {
    title: 'Labour line item config',
    Component: ItemChargeConfig,
  },
  ImportOrderSelector: {
    title: 'Import order',
    Component: ImportOrderSelector,
  },
  PaymentOverview: {
    title: 'Payments',
    Component: PaymentOverview,
  },
  CustomFieldValuesConfig: {
    title: 'Custom field values',
    Component: (props: Omit<CustomFieldValuesConfigProps, 'useRouter'>) => (
      <PermissionBoundary permissions={['read_settings', 'write_settings']}>
        <CustomFieldValuesConfig {...props} useRouter={useRouter} />
      </PermissionBoundary>
    ),
  },
  CustomFieldConfig: {
    title: 'Custom fields',
    Component: (props: Omit<CustomFieldConfigProps, 'useRouter'>) => (
      <CustomFieldConfig {...props} useRouter={useRouter} />
    ),
  },
  EditPreset: {
    title: 'Edit preset',
    Component: (props: Omit<EditPresetProps, 'useRouter'>) => <EditPreset {...props} useRouter={useRouter} />,
  },
  SelectPresetToEdit: {
    title: 'Edit preset',
    Component: (props: Omit<SelectPresetToEditProps, 'useRouter'>) => (
      <SelectPresetToEdit {...props} useRouter={useRouter} />
    ),
  },
  SavePreset: {
    title: 'Save preset',
    Component: (props: Omit<SavePresetProps, 'useRouter'>) => <SavePreset {...props} useRouter={useRouter} />,
  },
  SelectPreset: {
    title: 'Select preset',
    Component: (props: Omit<SelectPresetProps, 'useRouter'>) => <SelectPreset {...props} useRouter={useRouter} />,
  },
  ProductCreator: {
    title: 'Create product',
    Component: (props: Omit<ProductCreatorProps, 'useRouter'>) => <ProductCreator {...props} useRouter={useRouter} />,
  },
  CustomFieldFilterConfig: {
    title: 'Custom field filters',
    Component: (props: Omit<CustomFieldFilterConfigProps, 'useRouter'>) => (
      <CustomFieldFilterConfig {...props} useRouter={useRouter} />
    ),
  },
  WorkOrderPrintOverview: {
    title: 'Print',
    Component: WorkOrderPrintOverview,
  },
  ItemSelector: {
    title: 'Select item',
    Component: ItemSelector,
  },
  PaymentTermsSelector: {
    title: 'Select payment terms',
    Component: PaymentTermsSelector,
  },
  WorkOrderItemSourcing: {
    title: 'Work order sourcing',
    Component: WorkOrderItemSourcing,
  },
  WorkOrderItemSourcingHelp: {
    title: 'Work order sourcing help',
    Component: WorkOrderItemSourcingHelp,
  },
  WorkOrderItemSourcingItem: {
    title: 'Work order sourcing item',
    Component: WorkOrderItemSourcingItem,
  },
  StockTransferEntry: {
    title: 'Stock transfer',
    Component: () => (
      <ScreenPermissionBoundary permissions={requiredPermissions}>
        <StockTransferEntry />
      </ScreenPermissionBoundary>
    ),
  },
  StockTransfer: {
    title: 'Stock transfer',
    Component: StockTransfer,
  },
  StockTransferProductSelector: {
    title: 'Select product',
    Component: StockTransferProductSelector,
  },
  StockTransferLineItemScanner: {
    title: 'Scan items',
    Component: StockTransferLineItemScanner,
  },
  StockTransferLineItemConfig: {
    title: 'Line item config',
    Component: StockTransferLineItemConfig,
  },
  StockTransferLineItemStatusSelector: {
    title: 'Select status',
    Component: StockTransferLineItemStatusSelector,
  },
  ExistingStockTransfer: {
    title: 'Stock transfer',
    Component: ExistingStockTransfer,
  },
  ListPopup: {
    title: 'ListPopup',
    Component: <ID extends string = string>(props: Omit<ListPopupProps<ID>, 'useRouter'>) => (
      <ListPopup {...props} useRouter={useRouter} />
    ),
  },
  PurchaseOrderEntry: {
    title: 'Purchase orders',
    Component: () => (
      <ScrollView>
        <ScreenPermissionBoundary permissions={['read_settings', 'read_purchase_orders', 'read_employees']}>
          <PurchaseOrderEntry />
        </ScreenPermissionBoundary>
      </ScrollView>
    ),
  },
  PurchaseOrder: {
    title: 'Purchase order',
    Component: PurchaseOrder,
  },
  PurchaseOrderLoader: {
    title: 'Purchase order',
    Component: PurchaseOrderLoader,
  },
  PurchaseOrderVendorSelector: {
    title: 'Select vendor',
    Component: PurchaseOrderVendorSelector,
  },
  PurchaseOrderEmployeeSelector: {
    title: 'Select employee',
    // TODO: permission boundary here?
    Component: PurchaseOrderEmployeeSelector,
  },
  PurchaseOrderProductSelector: {
    title: 'Select product',
    Component: PurchaseOrderProductSelector,
  },
  PurchaseOrderProductConfig: {
    title: 'Product config',
    Component: PurchaseOrderProductConfig,
  },
  PurchaseOrderPrintOverview: {
    title: 'Print overview',
    Component: PurchaseOrderPrintOverview,
  },
  PurchaseOrderOrderSelector: {
    title: 'Select order',
    Component: PurchaseOrderOrderSelector,
  },
  PurchaseOrderFilterStatusSelector: {
    title: 'Select purchase order status',
    Component: PurchaseOrderFilterStatusSelector,
  },
  CreateTransferOrderForLocation: {
    title: 'Select transfer order location',
    Component: CreateTransferOrderForLocation,
  },
  QuantityAdjustmentList: {
    title: 'Quantity adjustment list',
    Component: QuantityAdjustmentList,
  },
  UnsourcedItemList: {
    title: 'Unsourced items',
    Component: UnsourcedItemList,
  },
  SelectPurchaseOrderProductsToTransfer: {
    title: 'Select products to transfer',
    Component: SelectPurchaseOrderProductsToTransfer,
  },
  CreateSpecialOrderList: {
    title: 'Create special order',
    Component: CreateSpecialOrderList,
  },
  CreatePurchaseOrderSpecialOrderSelector: {
    title: 'Select special orders',
    Component: CreatePurchaseOrderSpecialOrderSelector,
  },
  MultiEmployeeSelector: {
    title: 'Select employees',
    Component: (props: Omit<MultiEmployeeSelectorProps, 'useRouter'>) => (
      <MultiEmployeeSelector {...props} useRouter={useRouter} />
    ),
  },
  SpecialOrderSelector: {
    title: 'Select special order',
    Component: (props: Omit<SpecialOrderSelectorProps, 'useRouter'>) => (
      <SpecialOrderSelector {...props} useRouter={useRouter} />
    ),
  },
  MultiSpecialOrderLineItemSelector: {
    title: 'Select special order line item',
    Component: (props: Omit<MultiSpecialOrderLineItemSelectorProps, 'useRouter'>) => (
      <MultiSpecialOrderLineItemSelector {...props} useRouter={useRouter} />
    ),
  },

  SerialsList: {
    title: 'Serials',
    Component: SerialsList,
  },
  SerialsFilters: {
    title: 'Filter serials',
    Component: SerialsFilters,
  },
  Serial: {
    title: 'Serial',
    Component: Serial,
  },
  ProductVariantSelector: {
    title: 'Product selector',
    Component: (props: Omit<ProductVariantSelectorProps, 'useRouter'>) => (
      <ProductVariantSelector {...props} useRouter={useRouter} />
    ),
  },
  SerialSelector: {
    title: 'Serial selector',
    Component: (props: Omit<SerialSelectorProps, 'useRouter'>) => <SerialSelector {...props} useRouter={useRouter} />,
  },

  Scanner: {
    title: 'Scanner',
    Component: Scanner,
  },
});
