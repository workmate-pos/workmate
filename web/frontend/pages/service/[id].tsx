import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  EmptyState,
  Form,
  FormLayout,
  Frame,
  InlineStack,
  Layout,
  List,
  Modal,
  Page,
  ResourceItem,
  ResourceList,
  Select,
  Spinner,
  Text,
  TextField,
} from '@shopify/polaris';
import { useParams } from 'react-router-dom';
import { useServiceQuery } from '@work-orders/common/queries/use-service-query.js';
import { createGid, ID, isGid, parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { SubmissionResult, useForm } from '@conform-to/react';
import { match, P } from 'ts-pattern';
import { useServiceMutation } from '@work-orders/common/queries/use-service-mutation.js';
import { parseWithZod } from '@conform-to/zod';
import { UpsertService } from '@web/schemas/upsert-service.js';
import { useEffect, useState } from 'react';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { ToastActionCallable, useToast } from '@teifi-digital/shopify-app-react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { BigDecimal, Money, RoundingMode } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { Int } from '@web/schemas/generated/pagination-options.js';
import { useCurrencyFormatter } from '@work-orders/common/hooks/use-currency-formatter.js';
import { Labour, useLabourQueries } from '@work-orders/common/queries/use-labour-query.js';
import { useLaboursQuery } from '@work-orders/common/queries/use-labours-query.js';
import { getInfiniteQueryPagination } from '@web/frontend/util/pagination.js';
import { emptyState } from '@web/frontend/assets/index.js';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';
import { ParsedMetaobject } from '@web/services/metaobjects/index.js';
import {
  FIXED_PRICE_SERVICE,
  QUANTITY_ADJUSTING_SERVICE,
} from '@work-orders/common/metafields/product-service-type.js';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { identity } from '@teifi-digital/shopify-app-toolbox/functional';
import { LabourTabs, LabourType } from '@web/frontend/components/LabourTabs.js';

export default function Service() {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const app = useAppBridge();

  const params = useParams<'id'>();
  const id = params.id && params.id !== 'new' ? createGid('ProductVariant', params.id) : null;
  const serviceQuery = useServiceQuery({ fetch, id });
  const serviceMutation = useServiceMutation({ fetch });

  const lastResult = serviceMutation.data?.type === 'submission-result' ? serviceMutation.data.submissionResult : null;

  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: UpsertService });
    },
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
  });

  // polaris currently does not support uncontrolled components >:(
  const [title, setTitle] = useState('');
  const [type, setType] = useState<UpsertService['type']>('fixed');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<Money>();
  const [defaultChargeIds, setDefaultChargeIds] = useState<ID[]>([]);

  const selectedLabourQueries = useLabourQueries({ fetch, ids: defaultChargeIds });

  useEffect(() => {
    if (!serviceQuery.data) return;
    setTitle(serviceQuery.data.product.title);
    setType(
      match(serviceQuery.data.product.serviceType?.value)
        .returnType<UpsertService['type']>()
        .with(QUANTITY_ADJUSTING_SERVICE, () => 'dynamic')
        .with(FIXED_PRICE_SERVICE, () => 'fixed')
        .otherwise(() => 'dynamic'),
    );
    setSku(serviceQuery.data.sku ?? '');
    setDescription(serviceQuery.data.product.descriptionHtml ?? '');
    setPrice(serviceQuery.data.price ?? '');
    setDefaultChargeIds(serviceQuery.data.defaultCharges.map(charge => charge.id));
  }, [serviceQuery.data]);

  const [isLabourModalOpen, setIsLabourModalOpen] = useState(false);

  return (
    <Frame>
      <Page narrowWidth>
        <Card padding={'800'}>
          <Layout>
            <Layout.Section>
              <Text as="h1" variant="heading2xl">
                Service
              </Text>
            </Layout.Section>

            {serviceQuery.isError && (
              <Layout.Section>
                <Banner title="Error loading service" tone="warning">
                  {extractErrorMessage(serviceQuery.error, 'An error occurred while loading service')}
                </Banner>
              </Layout.Section>
            )}

            {serviceQuery.isLoading && (
              <Layout.Section>
                <Box padding={'3200'}>
                  <BlockStack align="center" inlineAlign="center">
                    <Spinner />
                  </BlockStack>
                </Box>
              </Layout.Section>
            )}

            {!!serviceQuery.data?.errors && (
              <Layout.Section>
                <Banner title="Service issues" tone="warning">
                  <List>
                    {serviceQuery.data.errors.map(error => (
                      <List.Item key={error}>{error}</List.Item>
                    ))}
                  </List>
                </Banner>
              </Layout.Section>
            )}

            {!!id && !serviceQuery.isLoading && !serviceQuery.data && (
              <Layout.Section>
                <Text as="p" variant="headingLg" fontWeight="bold" tone="subdued">
                  Service not found
                </Text>
              </Layout.Section>
            )}

            {(!id || !!serviceQuery.data) && (
              <Layout.Section>
                <Form
                  name={form.name}
                  noValidate={form.noValidate}
                  onSubmit={event => {
                    event.preventDefault();
                    serviceMutation.mutate(event.currentTarget, {
                      onSuccess(result) {
                        if (result.type === 'success') {
                          setToastAction({ content: 'Saved service!' });
                          Redirect.create(app).dispatch(
                            Redirect.Action.APP,
                            `/service/${parseGid(result.variant.id).id}`,
                          );
                        }
                      },
                    });
                  }}
                >
                  <FormLayout>
                    {id && <input type="hidden" name="productVariantId" value={createGid('ProductVariant', id)} />}
                    <TextField
                      label={'Title'}
                      autoComplete="off"
                      value={title}
                      onChange={setTitle}
                      requiredIndicator={fields.title.required}
                      name={fields.title.name}
                      error={fields.title.errors?.join(', ')}
                    />
                    <TextField
                      label={'SKU'}
                      autoComplete="off"
                      value={sku}
                      onChange={setSku}
                      name={fields.sku.name}
                      requiredIndicator={fields.sku.required}
                      error={fields.sku.errors?.join(', ')}
                    />
                    <TextField
                      label={'Description'}
                      autoComplete="off"
                      value={description}
                      onChange={setDescription}
                      multiline
                      name={fields.description.name}
                      requiredIndicator={fields.description.required}
                      error={fields.description.errors?.join(', ')}
                    />
                    <Select
                      label={'Service Type'}
                      options={[
                        {
                          value: 'dynamic' satisfies UpsertService['type'],
                          label: 'Dynamically-Priced Service',
                        },
                        {
                          value: 'fixed' satisfies UpsertService['type'],
                          label: 'Fixed-Price Service',
                        },
                      ]}
                      value={type}
                      onChange={selected => setType(selected as UpsertService['type'])}
                      requiredIndicator={fields.type.required}
                      name={fields.type.name}
                      error={fields.type.errors?.join(', ')}
                    />

                    {type === 'fixed' && (
                      <TextField
                        label={'Price'}
                        autoComplete="off"
                        value={price}
                        onChange={money => {
                          if (BigDecimal.isValid(money)) {
                            setPrice(BigDecimal.fromString(money).toMoney());
                          }
                        }}
                        name={fields.price.name}
                        requiredIndicator={fields.price.required}
                        error={fields.price.errors?.join(', ')}
                        prefix={'$'}
                      />
                    )}

                    {type === 'dynamic' && (
                      <>
                        <TextField
                          label={'Default Labour'}
                          helpText={
                            'These labour charges will automatically be added to this service when it is added to a work order.' +
                            ' You can add more labour charges during work order creation in Point of Sale or Shopify Admin.'
                          }
                          autoComplete="off"
                          readOnly
                          onFocus={() => setIsLabourModalOpen(true)}
                          value={
                            Object.values(selectedLabourQueries)
                              .map(query => query.data?.name ?? 'Unknown')
                              .join(', ') || 'No labour selected'
                          }
                          requiredIndicator={fields.defaultCharges.required}
                          error={fields.defaultCharges.errors?.join(', ')}
                        />
                        <input type="hidden" name={fields.defaultCharges.name} value={defaultChargeIds.join(',')} />
                      </>
                    )}

                    <InlineStack align="end">
                      <Button submit variant="primary" loading={serviceMutation.isLoading}>
                        Save
                      </Button>
                    </InlineStack>
                  </FormLayout>
                </Form>
              </Layout.Section>
            )}
          </Layout>
        </Card>
      </Page>

      <LabourSelectorModal
        open={isLabourModalOpen}
        onClose={() => setIsLabourModalOpen(false)}
        selectedLabourIds={defaultChargeIds}
        onChange={setDefaultChargeIds}
        setToastAction={setToastAction}
      />

      {toast}
    </Frame>
  );
}

function LabourSelectorModal({
  selectedLabourIds,
  open,
  onClose,
  onChange,
  setToastAction,
}: {
  open: boolean;
  onClose: () => void;
  selectedLabourIds: ID[];
  onChange: (labourIds: ID[]) => void;
  setToastAction: ToastActionCallable;
}) {
  const app = useAppBridge();

  const pageSize = 10 as Int;

  const [labourType, setLabourType] = useState<LabourType>('fixed');

  const fetch = useAuthenticatedFetch({ setToastAction });
  const laboursQuery = useLaboursQuery({ fetch, type: labourType, first: pageSize });
  const selectedLabourQueries = useLabourQueries({ fetch, ids: selectedLabourIds });

  const [pageIndex, setPageIndex] = useState(0);

  // Show the current selection on top, hide the rest.
  const page = [
    ...Object.values(selectedLabourQueries)
      .map(query => query?.data)
      .filter(isNonNullable),
    ...(laboursQuery.data?.pages[pageIndex]?.filter(labour => !selectedLabourIds.includes(labour.id)) ?? []),
  ];

  const isLoading = laboursQuery.isLoading || laboursQuery.isFetchingNextPage;

  const loadingPage: NonNullable<typeof page> = Array.from({ length: pageSize }, (_, i) => {
    return {
      id: createGid('Metaobject', i),
      type: 'fixed-price-labour-charge',
      name: 'Loading...',
      amount: BigDecimal.fromString('0.00').toMoney(),
      customizeAmount: false,
      removable: false,
    };
  });

  const pagination = getInfiniteQueryPagination(pageIndex, setPageIndex, laboursQuery);

  return (
    <Modal
      open={open}
      title={'Select Labour'}
      onClose={onClose}
      primaryAction={{
        content: 'New Labour',
        onAction: () => Redirect.create(app).dispatch(Redirect.Action.APP, '/labour/new'),
      }}
      secondaryActions={[
        {
          content: 'Reload',
          onAction: () => laboursQuery.refetch(),
          loading: laboursQuery.isRefetching,
        },
      ]}
    >
      <LabourTabs labourType={labourType} onSelect={setLabourType} fitted>
        <ResourceList
          items={isLoading ? loadingPage : page ?? []}
          key={selectedLabourIds.length}
          loading={isLoading}
          pagination={{
            hasNext: pagination.hasNextPage,
            onNext: pagination.next,
            hasPrevious: pagination.hasPreviousPage,
            onPrevious: pagination.previous,
          }}
          renderItem={labour => (
            <ResourceItem
              id={labour.id}
              name={labour.name}
              onClick={() => {
                if (selectedLabourIds.includes(labour.id)) {
                  onChange(selectedLabourIds.filter(id => id !== labour.id));
                } else {
                  onChange([...selectedLabourIds, labour.id]);
                }
              }}
            >
              <LabourItem labour={labour} setToastAction={setToastAction} />
            </ResourceItem>
          )}
          selectable
          selectedItems={selectedLabourIds}
          onSelectionChange={selected => {
            if (selected === 'All') {
              if (!page) {
                setToastAction({ content: 'You must wait for the page to load before selecting all labour' });
                return;
              }

              onChange(page.map(item => item.id));
            } else {
              onChange(selected.filter(isGid));
            }
          }}
          resourceName={{ singular: 'labour', plural: 'labour' }}
          idForItem={item => item.id}
          resolveItemId={item => item.id}
          emptyState={
            <Card>
              {!laboursQuery.isError && (
                <EmptyState
                  heading="Labour"
                  image={emptyState}
                  action={{
                    content: 'Create',
                    // TODO: new tab? doesnt seem possible
                    onAction: () => Redirect.create(app).dispatch(Redirect.Action.APP, '/labour/new'),
                  }}
                >
                  No labour yet
                </EmptyState>
              )}

              {laboursQuery.isError && (
                <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'} tone={'critical'}>
                  {extractErrorMessage(laboursQuery.error, 'An error occurred while loading labour')}
                </Text>
              )}
            </Card>
          }
        />
      </LabourTabs>
    </Modal>
  );
}

function LabourItem({ labour, setToastAction }: { labour: Labour; setToastAction: ToastActionCallable }) {
  return (
    <InlineStack align="space-between" blockAlign="center">
      <BlockStack gap={'200'}>
        <Text as="p" variant="bodyMd" fontWeight="semibold">
          {labour.name}
        </Text>
        <span>
          <LabourTypeBadge labour={labour} />
        </span>
      </BlockStack>
      <LabourPriceText labour={labour} setToastAction={setToastAction} />
    </InlineStack>
  );
}

export function LabourTypeBadge({ labour }: { labour: Labour }) {
  const type = match(labour.type)
    .with('hourly-labour-charge', () => 'Hourly')
    .with('fixed-price-labour-charge', () => 'Fixed')
    .exhaustive();

  return <Badge>{type}</Badge>;
}

export function LabourPriceText({ labour, setToastAction }: { labour: Labour; setToastAction: ToastActionCallable }) {
  const fetch = useAuthenticatedFetch({ setToastAction });
  const currencyFormatter = useCurrencyFormatter({ fetch });

  const price = match(labour)
    .with({ type: 'hourly-labour-charge' }, labour => formatHourlyLabourPrice(labour, currencyFormatter))
    .with({ type: 'fixed-price-labour-charge' }, labour => currencyFormatter(labour.amount))
    .exhaustive();

  return (
    <Text as="span" alignment="end" numeric>
      {price}
    </Text>
  );
}

export function formatHourlyLabourPrice(
  metaobject: ParsedMetaobject<'$app:hourly-labour-charge'>,
  currencyFormatter: ReturnType<typeof useCurrencyFormatter>,
) {
  const hours = BigDecimal.fromDecimal(metaobject.hours).trim();
  const rate = BigDecimal.fromMoney(metaobject.rate);
  const total = rate.multiply(hours).round(2, RoundingMode.CEILING);
  return `${hours.toString()} hours × ${currencyFormatter(rate.toMoney())} (${currencyFormatter(total.toMoney())})`;
}
