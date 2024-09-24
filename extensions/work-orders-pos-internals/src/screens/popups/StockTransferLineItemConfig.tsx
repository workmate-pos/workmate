import { CreateStockTransferDispatchProxy } from '../../create-stock-transfer/reducer.js';
import { useState } from 'react';
import { Badge, ScrollView, Selectable, Stack, Stepper, Text } from '@shopify/ui-extensions-react/point-of-sale';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { useAuthenticatedFetch } from '@teifi-digital/pos-tools/hooks/use-authenticated-fetch.js';
import { useLocationQuery } from '@work-orders/common/queries/use-location-query.js';
import { useInventoryItemQuery } from '@work-orders/common/queries/use-inventory-item-query.js';
import { useScreen } from '@teifi-digital/pos-tools/router';
import { useUnsavedChangesDialog } from '@teifi-digital/pos-tools/hooks/use-unsaved-changes-dialog.js';
import { getProductVariantName } from '@work-orders/common/util/product-variant-name.js';
import { ResponsiveStack } from '@teifi-digital/pos-tools/components/ResponsiveStack.js';
import { ResponsiveGrid } from '@teifi-digital/pos-tools/components/ResponsiveGrid.js';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { FormButton } from '@teifi-digital/pos-tools/components/form/FormButton.js';
import { Form } from '@teifi-digital/pos-tools/components/form/Form.js';
import { useRouter } from '../../routes.js';
import { Int, StockTransferLineItem } from '@web/schemas/generated/create-stock-transfer.js';
import { getStockTransferLineItemStatusBadgeProps } from '../../util/stock-transfer-line-item-status-badge-props.js';

export function StockTransferLineItemConfig({
  lineItem: initialLineItem,
  fromLocationId,
  toLocationId,
  dispatch,
}: {
  lineItem: StockTransferLineItem;
  dispatch: CreateStockTransferDispatchProxy;
  fromLocationId: ID | null;
  toLocationId: ID | null;
}) {
  const [lineItem, setLineItem] = useState(initialLineItem);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const fetch = useAuthenticatedFetch();

  const fromLocationQuery = useLocationQuery({ fetch, id: fromLocationId });
  const toLocationQuery = useLocationQuery({ fetch, id: toLocationId });

  const fromInventoryItemQuery = useInventoryItemQuery({
    fetch,
    id: lineItem.inventoryItemId,
    locationId: fromLocationId,
  });
  const toInventoryItemQuery = useInventoryItemQuery({ fetch, id: lineItem.inventoryItemId, locationId: toLocationId });

  const lineItemName =
    getProductVariantName({
      title: lineItem.productVariantTitle,
      product: { title: lineItem.productTitle, hasOnlyDefaultVariant: true },
    }) ?? 'Unknown Product';

  const screen = useScreen();
  const unsavedChangesDialog = useUnsavedChangesDialog({ hasUnsavedChanges });

  screen.addOverrideNavigateBack(unsavedChangesDialog.show);
  screen.setTitle(lineItemName);

  const router = useRouter();

  // TODO: Clearly indicate pending changes

  return (
    <ScrollView>
      <Form>
        <ResponsiveStack direction={'vertical'} spacing={2} flex={1} flexChildren>
          <Text variant={'headingLarge'}>{lineItemName}</Text>

          {(
            [
              [fromLocationQuery, fromInventoryItemQuery],
              [toLocationQuery, toInventoryItemQuery],
            ] as const
          ).map(([locationQuery, inventoryItemQuery]) => (
            <ResponsiveStack direction={'vertical'} spacing={4} paddingVertical={'Medium'}>
              <ResponsiveStack direction={'horizontal'} alignment={'center'} flex={1}>
                <Text variant="headingSmall" color="TextSubdued">
                  {locationQuery.data?.name ?? 'Unknown location'}
                </Text>
              </ResponsiveStack>

              <ResponsiveGrid columns={2}>
                {inventoryItemQuery?.data?.inventoryLevel?.quantities?.flatMap(({ name, quantity }) => [
                  <Stack key={`${name}-title`} direction={'horizontal'} alignment={'center'}>
                    <Text variant="body" color="TextSubdued">
                      {titleCase(name)}
                    </Text>
                  </Stack>,
                  <Stack key={`${name}-quantity`} direction={'horizontal'} alignment={'center'}>
                    <Text variant="body" color="TextSubdued">
                      {quantity}
                    </Text>
                  </Stack>,
                ])}
              </ResponsiveGrid>
            </ResponsiveStack>
          ))}

          <ResponsiveStack direction={'horizontal'} alignment={'space-between'}>
            <ResponsiveStack direction={'horizontal'} spacing={2}>
              <Text variant="body">Status</Text>
              <Selectable
                onPress={() =>
                  router.push('StockTransferLineItemStatusSelector', {
                    onSelect: status => setLineItem(li => ({ ...li, status })),
                  })
                }
              >
                <Text variant="body" color={'TextInteractive'}>
                  Change
                </Text>
              </Selectable>
            </ResponsiveStack>
            <Badge {...getStockTransferLineItemStatusBadgeProps({ status: lineItem.status })} />
          </ResponsiveStack>

          <Text variant="body">Quantity</Text>
          <Stepper
            minimumValue={1}
            initialValue={lineItem.quantity}
            value={lineItem.quantity}
            onValueChanged={(quantity: Int) => {
              setLineItem(li => ({ ...li, quantity }));
              setHasUnsavedChanges(true);
            }}
          />

          <ResponsiveGrid columns={2}>
            <FormButton
              title={'Remove'}
              type={'destructive'}
              onPress={() => {
                dispatch.removeLineItems({ lineItems: [lineItem] });
                router.popCurrent();
              }}
            />
            <FormButton
              title={'Save'}
              action={'submit'}
              onPress={() => {
                dispatch.updateLineItems({ lineItems: [lineItem] });
                router.popCurrent();
              }}
            />
          </ResponsiveGrid>
        </ResponsiveStack>
      </Form>
    </ScrollView>
  );
}
