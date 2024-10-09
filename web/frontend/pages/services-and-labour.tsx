import {
  Badge,
  BlockStack,
  Button,
  Card,
  EmptyState,
  Frame,
  Icon,
  IndexTable,
  InlineStack,
  Layout,
  Link,
  Page,
  SkeletonBodyText,
  Text,
  Tooltip,
} from '@shopify/polaris';
import { emptyState } from '@web/frontend/assets/index.js';
import { ToastActionCallable, useToast } from '@teifi-digital/shopify-app-react';
import { CircleAlertMajor } from '@shopify/polaris-icons';
import { useState } from 'react';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useLaboursQuery } from '@work-orders/common/queries/use-labours-query.js';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { pick } from '@teifi-digital/shopify-app-toolbox/object';
import { match } from 'ts-pattern';
import { useCurrencyFormatter } from '@work-orders/common/hooks/use-currency-formatter.js';
import { Int } from '@web/schemas/generated/pagination-options.js';
import { parseGid } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useServicesQuery } from '@work-orders/common/queries/use-services-query.js';
import {
  FIXED_PRICE_SERVICE,
  getProductServiceType,
  QUANTITY_ADJUSTING_SERVICE,
} from '@work-orders/common/metafields/product-service-type.js';
import { getTotalPriceForCharges } from '@work-orders/common/create-work-order/charges.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { getInfiniteQueryPagination } from '@web/frontend/util/pagination.js';
import { formatHourlyLabourPrice, LabourPriceText, LabourTypeBadge } from '@web/frontend/pages/service/[id].js';
import { LabourType, LabourTabs } from '@web/frontend/components/LabourTabs.js';
import { Redirect } from '@shopify/app-bridge/actions';
import { useAppBridge } from '@shopify/app-bridge-react';

/**
 * Services and labour page.
 * This page makes it easy to configure services and labour.
 * Services are products that are configured through a metafield (which indicates the kind of service, i.e. fixed-price or quantity-adjusting).
 */
export default function ServicesAndLabour() {
  const [labourType, setLabourType] = useState<LabourType>('fixed');

  const [toast, setToastAction] = useToast();
  const app = useAppBridge();

  const service = useServiceRows(setToastAction);
  const labour = useLabourRows(labourType, setToastAction);

  return (
    <Frame>
      <Page>
        <Layout>
          <Layout.Section>
            <Text as="h1" variant="heading2xl">
              Services & Labour
            </Text>
            <Text as="p" tone="subdued" variant="bodyLg">
              WorkMate's services and labour options allows you to add stand-alone services and product-related labour
              to your work orders. Whether you want to sell a time-based service or a service that has a fixed price,
              WorkMate has you covered.
            </Text>
          </Layout.Section>

          <Layout.Section>
            <Layout>
              <Layout.Section>
                <BlockStack gap="200">
                  <BlockStack gap="200">
                    <InlineStack align="space-between" gap="200">
                      <Text as="h2" variant="headingLg">
                        Services
                      </Text>
                      <Button
                        variant="primary"
                        onClick={() => Redirect.create(app).dispatch(Redirect.Action.APP, '/service/new')}
                      >
                        Create Service
                      </Button>
                    </InlineStack>
                    <Text as="p" tone="subdued">
                      There are two types of services: fixed-price services and dynamic-price services. Fixed-price
                      services have a set price, while dynamic-price services group together multiple labour charges
                      into a single line item.
                    </Text>
                  </BlockStack>

                  <IndexTable
                    headings={[
                      { title: 'Alert', hidden: true },
                      { title: 'Service' },
                      { title: 'SKU' },
                      { title: 'Type' },
                      { title: 'Price', alignment: 'end' },
                    ]}
                    resourceName={{ singular: 'service', plural: 'services' }}
                    itemCount={service.page?.length ?? 0}
                    selectable={false}
                    loading={service.isLoading}
                    pagination={{
                      hasNext: service.pagination.hasNextPage,
                      onNext: service.pagination.next,
                      onPrevious: service.pagination.previous,
                      hasPrevious: service.pagination.hasPreviousPage,
                    }}
                    emptyState={
                      <Card>
                        {!service.isError && (
                          <EmptyState
                            heading="Services"
                            image={emptyState}
                            action={{
                              content: 'Create',
                              onAction: () => Redirect.create(app).dispatch(Redirect.Action.APP, '/service/new'),
                            }}
                          >
                            No services yet
                          </EmptyState>
                        )}

                        {service.isError && (
                          <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'} tone={'critical'}>
                            {extractErrorMessage(service.error, 'An error occurred while loading services')}
                          </Text>
                        )}
                      </Card>
                    }
                  >
                    {service.page}
                  </IndexTable>
                </BlockStack>
              </Layout.Section>

              <Layout.Section>
                <BlockStack gap="200">
                  <BlockStack gap="100">
                    <InlineStack align="space-between" gap="200">
                      <Text as="h2" variant="headingLg">
                        Labour
                      </Text>
                      <Button
                        variant="primary"
                        onClick={() => Redirect.create(app).dispatch(Redirect.Action.APP, '/labour/new')}
                      >
                        Create Labour
                      </Button>
                    </InlineStack>
                    <Text as="p" tone="subdued">
                      Labour can be added to products to provide customers with additional services, such as
                      installation, configuration, and more. Labour can have a fixed price, or an hourly rate. You can
                      create labour presets below, but can also create them from scratch inside work orders.
                    </Text>
                  </BlockStack>

                  <LabourTabs labourType={labourType} onSelect={setLabourType}>
                    <IndexTable
                      headings={[{ title: 'Labour' }, { title: 'Type' }, { title: 'Price', alignment: 'end' }]}
                      resourceName={{ singular: 'labour', plural: 'labour' }}
                      itemCount={labour.page?.length ?? 0}
                      selectable={false}
                      loading={labour.isLoading}
                      pagination={{
                        hasNext: labour.pagination.hasNextPage,
                        onNext: labour.pagination.next,
                        onPrevious: labour.pagination.previous,
                        hasPrevious: labour.pagination.hasPreviousPage,
                      }}
                      emptyState={
                        <Card>
                          {!labour.isError && (
                            <EmptyState
                              heading={`${titleCase(labourType)} Labour`}
                              image={emptyState}
                              action={{
                                content: 'Create',
                                onAction: () => Redirect.create(app).dispatch(Redirect.Action.APP, '/labour/new'),
                              }}
                            >
                              No {labourType.toLowerCase()} labour yet
                            </EmptyState>
                          )}

                          {labour.isError && (
                            <Text as={'p'} variant={'bodyMd'} fontWeight={'bold'} tone={'critical'}>
                              {extractErrorMessage(labour.error, 'An error occurred while loading labour')}
                            </Text>
                          )}
                        </Card>
                      }
                    >
                      {labour.page}
                    </IndexTable>
                  </LabourTabs>
                </BlockStack>
              </Layout.Section>
            </Layout>
          </Layout.Section>
        </Layout>
      </Page>

      {toast}
    </Frame>
  );
}

function useServiceRows(setToastAction: ToastActionCallable) {
  const pageSize = 20 as Int;

  const fetch = useAuthenticatedFetch({ setToastAction });
  const currencyFormatter = useCurrencyFormatter({ fetch });
  const servicesQuery = useServicesQuery({ fetch, first: pageSize });

  const [pageIndex, setPageIndex] = useState(0);

  const page = servicesQuery.data?.pages[pageIndex]?.map((service, i) => {
    const url = `/service/${parseGid(service.id).id}`;

    const name = getProductVariantName(service) ?? service.title ?? 'Unknown service';

    const price = match(service)
      .with({ product: { serviceType: { value: QUANTITY_ADJUSTING_SERVICE } } }, () => {
        if (service.defaultCharges.length === 1 && service.defaultCharges[0]?.type === 'hourly-labour-charge') {
          return formatHourlyLabourPrice(service.defaultCharges[0], currencyFormatter);
        }

        return currencyFormatter(
          getTotalPriceForCharges(
            service.defaultCharges.map(charge =>
              match(charge)
                .returnType<Parameters<typeof getTotalPriceForCharges>[0][number]>()
                .with({ type: 'fixed-price-labour-charge' }, ({ amount }) => ({ type: 'fixed-price-labour', amount }))
                .with({ type: 'hourly-labour-charge' }, ({ hours, rate }) => ({ type: 'hourly-labour', hours, rate }))
                .exhaustive(),
            ),
          ),
        );
      })
      .otherwise(service => currencyFormatter(service.price));

    const type = match(getProductServiceType(service.product.serviceType?.value))
      .with(QUANTITY_ADJUSTING_SERVICE, () => 'Dynamically Priced Service')
      .with(FIXED_PRICE_SERVICE, () => 'Fixed-Price Service')
      .otherwise(() => 'Unknown');

    return (
      <IndexTable.Row id={service.id} position={i}>
        <IndexTable.Cell>
          {!!service.errors && (
            <Tooltip content={'This service is configured incorrectly'}>
              <Icon source={CircleAlertMajor} tone="critical" />
            </Tooltip>
          )}
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Link dataPrimaryLink removeUnderline monochrome url={url}>
            <Text as="span" variant="bodyMd" fontWeight="bold">
              {name}
            </Text>
          </Link>
        </IndexTable.Cell>
        <IndexTable.Cell>{service.sku}</IndexTable.Cell>
        <IndexTable.Cell>
          <Badge>{type}</Badge>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span" alignment="end" numeric>
            {price}
          </Text>
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });

  const isLoading = servicesQuery.isLoading || servicesQuery.isFetchingNextPage;

  const loadingPage = Array.from({ length: pageSize }).map((_, i) => (
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
      <IndexTable.Cell>
        <SkeletonBodyText lines={1} />
      </IndexTable.Cell>
      <IndexTable.Cell>
        <SkeletonBodyText lines={1} />
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return {
    ...pick(servicesQuery, 'isError', 'error'),
    isLoading,
    page: isLoading ? loadingPage : page,
    pagination: getInfiniteQueryPagination(pageIndex, setPageIndex, servicesQuery),
  };
}

function useLabourRows(labourTab: LabourType, setToastAction: ToastActionCallable) {
  const pageSize = 20 as Int;

  const fetch = useAuthenticatedFetch({ setToastAction });
  const labourQuery = useLaboursQuery({ fetch, type: labourTab, first: pageSize });

  const [pageIndex, setPageIndex] = useState(0);

  const page = labourQuery.data?.pages[pageIndex]?.map((labour, i) => {
    const url = `/labour/${parseGid(labour.id).id}`;

    return (
      <IndexTable.Row id={labour.id} position={i}>
        <IndexTable.Cell>
          <Link dataPrimaryLink removeUnderline monochrome url={url}>
            <Text as="span" variant="bodyMd" fontWeight="bold">
              {labour.name}
            </Text>
          </Link>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <LabourTypeBadge labour={labour} />
        </IndexTable.Cell>
        <IndexTable.Cell>
          <LabourPriceText labour={labour} setToastAction={setToastAction} />
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });

  const isLoading = labourQuery.isLoading || labourQuery.isFetchingNextPage;

  const loadingPage = Array.from({ length: pageSize }).map((_, i) => (
    <IndexTable.Row id={String(i)} position={i} disabled>
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
  ));

  return {
    ...pick(labourQuery, 'isError', 'error'),
    isLoading,
    page: isLoading ? loadingPage : page,
    pagination: getInfiniteQueryPagination(pageIndex, setPageIndex, labourQuery),
  };
}
