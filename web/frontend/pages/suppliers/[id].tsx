import {
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  Frame,
  InlineStack,
  Page,
  Spinner,
  Text,
  TextField,
} from '@shopify/polaris';
import { useParams } from 'react-router-dom';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useSupplierQuery } from '@work-orders/common/queries/use-supplier-query.js';
import { ReactNode, useEffect, useState } from 'react';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { CreateSupplier } from '@web/schemas/generated/create-supplier.js';
import { ContextualSaveBar, Loading, TitleBar } from '@shopify/app-bridge-react';
import { useVendorsQuery } from '@work-orders/common/queries/use-vendors-query.js';
import { SearchableChoiceList } from '@web/frontend/components/form/SearchableChoiceList.js';
import {
  ProductVariantResourceItemContent,
  ProductVariantResourceList,
  ProductVariantResourceListEmptyState,
} from '@web/frontend/components/ProductVariantResourceList.js';
import { MinusMinor, PlusMinor } from '@shopify/polaris-icons';
import { ProductVariantSelectorModal } from '@web/frontend/components/selectors/ProductVariantSelectorModal.js';
import { useSupplierMutation } from '@work-orders/common/queries/use-supplier-mutation.js';
import { useStaticPagination } from '@web/frontend/hooks/pagination.js';
import {
  VendorResourceItemContent,
  VendorResourceList,
  VendorResourceListEmptyState,
} from '@web/frontend/components/VendorResourceList.js';
import { VendorSelectorModal } from '@web/frontend/components/selectors/VendorSelectorModal.js';

const defaultCreateSupplier: CreateSupplier = { name: '', vendors: [], productVariantIds: [] };

// page size used for vendors and product variants
const PAGE_SIZE = 10;

export default function Supplier() {
  const { id } = useParams<'id'>();
  const supplierId = Number(id);

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const supplierQuery = useSupplierQuery({ fetch, id: supplierId });
  const supplierMutation = useSupplierMutation({ fetch });

  const [lastSavedSupplier, setLastSavedSupplier] = useState<CreateSupplier>(defaultCreateSupplier);
  const [createSupplier, setCreateSupplier] = useState<CreateSupplier>(defaultCreateSupplier);

  const save = () =>
    supplierMutation.mutate(
      { ...createSupplier, id: supplierId },
      {
        onSuccess() {
          setToastAction({ content: 'Saved supplier' });
        },
      },
    );

  const hasUnsavedChanges = lastSavedSupplier.name !== createSupplier.name;

  useEffect(() => {
    if (!hasUnsavedChanges) {
      const createSupplier: CreateSupplier = {
        ...defaultCreateSupplier,
        name: supplierQuery.data?.name ?? '',
        vendors: supplierQuery.data?.vendors ?? [],
        productVariantIds: supplierQuery.data?.productVariantIds ?? [],
      };
      setLastSavedSupplier(createSupplier);
      setCreateSupplier(createSupplier);
    }
  }, [supplierQuery.data]);

  const [isVendorSelectorModalOpen, setIsVendorSelectorModalOpen] = useState(false);
  const [isProductVariantSelectorModalOpen, setIsProductVariantSelectorModalOpen] = useState(false);

  const { page: vendorPage, ...vendorsPagination } = useStaticPagination(createSupplier.vendors, PAGE_SIZE);

  const { page: productVariantPage, ...productVariantPagination } = useStaticPagination(
    createSupplier.productVariantIds,
    PAGE_SIZE,
  );

  if (supplierQuery.isLoading) {
    return (
      <Shell toast={toast}>
        <Spinner />
      </Shell>
    );
  }

  if (supplierQuery.isError) {
    return (
      <Shell toast={toast}>
        <Banner
          title="Error loading supplier"
          tone="critical"
          action={{
            content: 'Retry',
            onAction: () => supplierQuery.refetch(),
          }}
        >
          {extractErrorMessage(supplierQuery.error, 'An error occurred while loading supplier')}
        </Banner>
      </Shell>
    );
  }

  const addVendorsButton = (
    <Button variant="plain" icon={PlusMinor} onClick={() => setIsVendorSelectorModalOpen(true)}>
      Add vendors
    </Button>
  );

  const addProductsButton = (
    <Button variant="plain" icon={PlusMinor} onClick={() => setIsProductVariantSelectorModalOpen(true)}>
      Add products
    </Button>
  );

  return (
    <Shell toast={toast} title={createSupplier.name}>
      <ContextualSaveBar
        saveAction={{
          loading: supplierMutation.isPending,
          onAction: () => save(),
        }}
        visible={hasUnsavedChanges}
        discardAction={{
          onAction: () => setCreateSupplier(lastSavedSupplier),
        }}
      />

      <Card padding="800">
        <Box paddingBlockEnd="400">
          <Text as="h1" variant="headingXl">
            Supplier
          </Text>
        </Box>

        <BlockStack gap="800">
          <BlockStack gap="200">
            <TextField
              label="Name"
              autoComplete="off"
              value={createSupplier.name}
              onChange={name => setCreateSupplier({ ...createSupplier, name })}
              requiredIndicator
            />
          </BlockStack>

          <BlockStack gap="400">
            <BlockStack gap="050">
              <Text as="h2" variant="headingLg" fontWeight="bold">
                Vendors
              </Text>

              <Text as="p" variant="bodyMd" tone="subdued">
                All products associated with the selected vendors will can be supplied by this supplier
              </Text>
            </BlockStack>

            {createSupplier.vendors.length > 0 && addVendorsButton}

            {!createSupplier.vendors.length ? (
              <VendorResourceListEmptyState verb="selected">{addVendorsButton}</VendorResourceListEmptyState>
            ) : (
              <VendorResourceList
                vendors={vendorPage}
                onClick={() => {}}
                pagination={vendorsPagination}
                render={vendor => (
                  <VendorResourceItemContent
                    vendor={vendor}
                    right={
                      <Button
                        variant="plain"
                        tone="critical"
                        icon={MinusMinor}
                        onClick={() =>
                          setCreateSupplier(current => ({
                            ...current,
                            vendors: current.vendors.filter(id => id !== vendor.name),
                          }))
                        }
                      >
                        Remove
                      </Button>
                    }
                  />
                )}
                emptyState={
                  <VendorResourceListEmptyState verb="selected">{addVendorsButton}</VendorResourceListEmptyState>
                }
              />
            )}
          </BlockStack>

          <BlockStack gap="400">
            <BlockStack gap="050">
              <Text as="h2" variant="headingLg" fontWeight="bold">
                Products
              </Text>

              <Text as="p" variant="bodyMd" tone="subdued">
                You can select individual products to be supplied by this supplier. This list does not include products
                associated with selected vendors
              </Text>
            </BlockStack>

            {createSupplier.productVariantIds.length > 0 && addProductsButton}

            {!createSupplier.productVariantIds.length ? (
              <ProductVariantResourceListEmptyState verb="selected">
                {addProductsButton}
              </ProductVariantResourceListEmptyState>
            ) : (
              <ProductVariantResourceList
                productVariantIds={productVariantPage}
                onClick={() => {}}
                pagination={productVariantPagination}
                render={productVariant => (
                  <ProductVariantResourceItemContent
                    productVariant={productVariant}
                    right={
                      <Button
                        variant="plain"
                        tone="critical"
                        icon={MinusMinor}
                        onClick={() =>
                          setCreateSupplier(current => ({
                            ...current,
                            productVariantIds: current.productVariantIds.filter(id => id !== productVariant.id),
                          }))
                        }
                      >
                        Remove
                      </Button>
                    }
                  />
                )}
                emptyState={
                  <ProductVariantResourceListEmptyState verb="selected">
                    {addProductsButton}
                  </ProductVariantResourceListEmptyState>
                }
              />
            )}
          </BlockStack>

          <Button variant="primary" onClick={() => save()} loading={supplierMutation.isPending}>
            Save
          </Button>
        </BlockStack>
      </Card>

      <ProductVariantSelectorModal
        onSelect={productVariant =>
          setCreateSupplier(current => ({
            ...current,
            productVariantIds: [productVariant.id, ...current.productVariantIds.filter(id => id !== productVariant.id)],
          }))
        }
        closeOnSelect={false}
        filters={{ type: ['product', 'serial'] }}
        open={isProductVariantSelectorModalOpen}
        onClose={() => setIsProductVariantSelectorModalOpen(false)}
        selectedProductVariantIds={createSupplier.productVariantIds}
        onSelectedProductVariantIdsChange={productVariantIds =>
          setCreateSupplier(current => ({
            ...current,
            productVariantIds,
          }))
        }
      />

      <VendorSelectorModal
        open={isVendorSelectorModalOpen}
        onClose={() => setIsVendorSelectorModalOpen(false)}
        selectedVendors={createSupplier.vendors}
        onSelectedVendorsChange={vendors =>
          setCreateSupplier(current => ({
            ...current,
            vendors,
          }))
        }
        onSelect={vendor =>
          setCreateSupplier(current => ({
            ...current,
            vendors: [vendor, ...current.vendors.filter(v => v !== vendor)],
          }))
        }
      />
    </Shell>
  );
}

function Shell({ title, children, toast }: { title?: string; children: ReactNode; toast: ReactNode }) {
  return (
    <Frame>
      <Page fullWidth>
        <TitleBar title={title || 'Supplier'} />

        {children}
        {toast}
      </Page>
    </Frame>
  );
}

function Vendors({ vendors, setVendors }: { vendors: string[]; setVendors: (vendors: string[]) => void }) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const vendorsQuery = useVendorsQuery({ fetch });

  if (vendorsQuery.isError) {
    return (
      <Banner
        title="Error loading vendors"
        tone="critical"
        action={{
          content: 'Retry',
          onAction: () => vendorsQuery.refetch(),
        }}
      >
        {extractErrorMessage(vendorsQuery.error, 'An error occurred while loading vendors')}
      </Banner>
    );
  }

  if (vendorsQuery.isPending) {
    return (
      <InlineStack align="center" blockAlign="center">
        <Loading />
        <Spinner />
      </InlineStack>
    );
  }

  return (
    <>
      <SearchableChoiceList
        choices={vendorsQuery.data.map(vendor => ({
          label: vendor.name,
          value: vendor.name,
        }))}
        selected={vendors}
        onChange={setVendors}
        searchable
        resourceName={{ singular: 'vendor', plural: 'vendors' }}
      />
    </>
  );
}
