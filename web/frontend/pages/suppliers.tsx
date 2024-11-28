import {
  Banner,
  BlockStack,
  Card,
  FormLayout,
  Frame,
  IndexFilters,
  IndexFiltersMode,
  IndexTable,
  Link,
  Modal,
  Page,
  SkeletonBodyText,
  Text,
  TextField,
} from '@shopify/polaris';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { SupplierPaginationOptions } from '@web/schemas/generated/supplier-pagination-options.js';
import { useState } from 'react';
import { useDebouncedState } from '@web/frontend/hooks/use-debounced-state.js';
import { useSuppliersQuery } from '@work-orders/common/queries/use-suppliers-query.js';
import { NonEmptyArray } from '@teifi-digital/shopify-app-toolbox/array';
import { IndexTableHeading } from '@shopify/polaris/build/ts/src/components/IndexTable/index.js';
import { getInfiniteQueryPagination } from '@web/frontend/util/pagination.js';
import { TitleBar, useAppBridge } from '@shopify/app-bridge-react';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { Redirect } from '@shopify/app-bridge/actions';
import { useSupplierMutation } from '@work-orders/common/queries/use-supplier-mutation.js';
import { SearchableChoiceList } from '@web/frontend/components/form/SearchableChoiceList.js';
import { useVendorsQuery } from '@work-orders/common/queries/use-vendors-query.js';

const PAGE_SIZE = 50;

export default function Suppliers() {
  const app = useAppBridge();

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const [mode, setMode] = useState(IndexFiltersMode.Default);
  const [query, setQuery, optimisticQuery] = useDebouncedState('');
  const [options, setOptions] = useState<Partial<Omit<SupplierPaginationOptions, 'offset' | 'limit' | 'query'>>>({});

  const suppliersQuery = useSuppliersQuery({
    fetch,
    params: {
      query,
      limit: PAGE_SIZE,
      ...options,
    },
  });

  type HeadingId = { id?: SupplierPaginationOptions['sortMode'] };

  const headings: NonEmptyArray<IndexTableHeading & HeadingId> = [
    {
      title: 'Name',
      id: 'name',
    },
    {
      title: 'Last used',
      id: 'relevant',
    },
  ];

  const [pageIndex, setPageIndex] = useState(0);
  const pagination = getInfiniteQueryPagination(pageIndex, setPageIndex, suppliersQuery);
  const page = suppliersQuery.data?.pages[pageIndex]?.suppliers ?? [];

  const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = useState(false);

  return (
    <Frame>
      <Page fullWidth>
        <Card>
          <TitleBar
            title="Suppliers"
            primaryAction={{
              content: 'New supplier',
              onAction: () => setIsNewSupplierModalOpen(true),
            }}
          />

          <BlockStack gap="200">
            <BlockStack>
              <Text as="h1" variant="headingMd" fontWeight="bold">
                Suppliers
              </Text>

              <Text as="p" variant="bodyMd" tone="subdued">
                Manage suppliers and the product variants they supply
              </Text>
            </BlockStack>

            {suppliersQuery.isError && (
              <Banner
                title="Error loading suppliers"
                tone="critical"
                action={{
                  content: 'Retry',
                  loading: suppliersQuery.isFetching,
                  onAction: () => suppliersQuery.refetch(),
                }}
              >
                {extractErrorMessage(suppliersQuery.error, 'An error occurred while suppliers')}
              </Banner>
            )}
          </BlockStack>

          <IndexFilters
            canCreateNewView={false}
            mode={mode}
            setMode={setMode}
            filters={[]}
            onQueryChange={setQuery}
            onQueryClear={() => setQuery('', true)}
            onClearAll={() => setQuery('', true)}
            queryValue={optimisticQuery}
            queryPlaceholder="Search suppliers"
            tabs={[]}
            selected={0}
            loading={suppliersQuery.isFetching}
          />

          <IndexTable
            headings={[...headings]}
            itemCount={page.length}
            sortable={headings.map(heading => !!heading.id)}
            resourceName={{
              singular: 'supplier',
              plural: 'suppliers',
            }}
            loading={suppliersQuery.isFetching}
            selectable={false}
            pagination={{
              hasNext: pagination.hasNextPage,
              onNext: pagination.next,
              hasPrevious: pagination.hasPreviousPage,
              onPrevious: pagination.previous,
            }}
            sortColumnIndex={headings.findIndex(heading => heading.id === options.sortMode)}
            sortDirection={options.sortOrder}
            onSort={(headingIndex, sortOrder) => {
              const sortMode = headings[headingIndex]?.id;

              if (!sortMode) {
                return;
              }

              setOptions(current => ({ ...current, sortOrder, sortMode }));
            }}
          >
            {page.map((supplier, i) => (
              <IndexTable.Row key={supplier.id} id={supplier.id.toString()} selected={false} position={i}>
                <IndexTable.Cell>
                  <Link dataPrimaryLink removeUnderline monochrome url={`/suppliers/${supplier.id}`}>
                    <Text as={'p'} fontWeight={'bold'} variant="bodyMd">
                      {supplier.name}
                    </Text>
                  </Link>
                </IndexTable.Cell>

                <IndexTable.Cell>{supplier.lastUsedAt.toLocaleDateString()}</IndexTable.Cell>
              </IndexTable.Row>
            ))}

            {suppliersQuery.isLoading &&
              Array.from({ length: PAGE_SIZE }, (_, i) => (
                <IndexTable.Row key={i} id={String(i)} selected={false} position={i}>
                  <IndexTable.Cell>
                    <SkeletonBodyText lines={1} />
                  </IndexTable.Cell>

                  <IndexTable.Cell>
                    <SkeletonBodyText lines={1} />
                  </IndexTable.Cell>

                  <IndexTable.Cell>
                    <SkeletonBodyText lines={1} />
                  </IndexTable.Cell>
                </IndexTable.Row>
              ))}
          </IndexTable>

          <NewSupplierModal open={isNewSupplierModalOpen} onClose={() => setIsNewSupplierModalOpen(false)} />

          {toast}
        </Card>
      </Page>
    </Frame>
  );
}

function NewSupplierModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const app = useAppBridge();

  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });

  const supplierMutation = useSupplierMutation({ fetch });
  const vendorsQuery = useVendorsQuery({ fetch });

  const [name, setName] = useState('');
  const [vendors, setVendors] = useState<string[]>([]);

  return (
    <>
      <Modal
        open={open}
        title={'New supplier'}
        onClose={onClose}
        loading={vendorsQuery.isLoading}
        primaryAction={{
          content: 'Create',
          disabled: !name,
          loading: supplierMutation.isPending,
          onAction: () =>
            supplierMutation.mutate(
              { id: null, name, address: '', vendors },
              {
                onSuccess(supplier) {
                  setToastAction({ content: 'Supplier created!' });
                  Redirect.create(app).dispatch(Redirect.Action.APP, `/suppliers/${supplier.id}`);
                },
              },
            ),
        }}
      >
        <Modal.Section>
          <FormLayout>
            <TextField label="Name" autoComplete="off" requiredIndicator value={name} onChange={setName} />
          </FormLayout>
        </Modal.Section>

        <Modal.Section>
          <FormLayout>
            <BlockStack gap="050">
              <Text as="p" variant="bodyMd" fontWeight="bold">
                Vendors
              </Text>

              <Text as="p" variant="bodyMd" tone="subdued">
                Select vendors for which this supplier can supply products. You can add more vendors and individual
                products later.
              </Text>
            </BlockStack>

            {vendorsQuery.isError && (
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
            )}

            {vendorsQuery.data && (
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
            )}
          </FormLayout>
        </Modal.Section>
      </Modal>
      {toast}
    </>
  );
}
