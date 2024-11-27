import { Banner, BlockStack, Box, Button, Card, Frame, Page, Spinner, Text, TextField } from '@shopify/polaris';
import { useParams } from 'react-router-dom';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useSupplierQuery } from '@work-orders/common/queries/use-supplier-query.js';
import { ReactNode, useEffect, useState } from 'react';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { CreateSupplier } from '@web/schemas/generated/create-supplier.js';
import { ContextualSaveBar, TitleBar } from '@shopify/app-bridge-react';
import { MinusMinor, PlusMinor } from '@shopify/polaris-icons';
import { useSupplierMutation } from '@work-orders/common/queries/use-supplier-mutation.js';
import {
  VendorResourceItemContent,
  VendorResourceList,
  VendorResourceListEmptyState,
} from '@web/frontend/components/VendorResourceList.js';
import { VendorSelectorModal } from '@web/frontend/components/selectors/VendorSelectorModal.js';
import { DetailedSupplier } from '@web/services/suppliers/get.js';
import { useStaticPagination } from '@work-orders/common/util/pagination.js';

const defaultCreateSupplier: CreateSupplier = { name: '', address: '', vendors: [] };
const getCreateSupplierFromDetailedSupplier = (supplier: DetailedSupplier): CreateSupplier => ({
  ...defaultCreateSupplier,
  name: supplier.name,
  address: supplier.address ?? '',
  vendors: supplier.vendors,
});

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
        onSuccess(result) {
          setToastAction({ content: 'Saved supplier' });

          const createSupplier: CreateSupplier = getCreateSupplierFromDetailedSupplier(result);
          setLastSavedSupplier(createSupplier);
          setCreateSupplier(createSupplier);
        },
      },
    );

  const hasUnsavedChanges =
    JSON.stringify(lastSavedSupplier, Object.keys(lastSavedSupplier).sort()) !==
    JSON.stringify(createSupplier, Object.keys(createSupplier).sort());

  useEffect(() => {
    if (!hasUnsavedChanges && !!supplierQuery.data) {
      const createSupplier: CreateSupplier = getCreateSupplierFromDetailedSupplier(supplierQuery.data);

      setLastSavedSupplier(createSupplier);
      setCreateSupplier(createSupplier);
    }
  }, [supplierQuery.data]);

  const [isVendorSelectorModalOpen, setIsVendorSelectorModalOpen] = useState(false);

  const { page: vendorPage, ...vendorsPagination } = useStaticPagination(createSupplier.vendors, PAGE_SIZE);

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

            <TextField
              label="Address"
              autoComplete="off"
              value={createSupplier.address}
              onChange={address => setCreateSupplier({ ...createSupplier, address })}
              multiline={3}
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

          <Button variant="primary" onClick={() => save()} loading={supplierMutation.isPending}>
            Save
          </Button>
        </BlockStack>
      </Card>

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
      <Page>
        <TitleBar title={title || 'Supplier'} />

        {children}
        {toast}
      </Page>
    </Frame>
  );
}
