import { Banner, BlockStack, Button, ButtonGroup, InlineGrid, Tooltip } from '@shopify/polaris';
import { MoneyField } from '@web/frontend/components/MoneyField.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { WIPCreateWorkOrder } from '@work-orders/common/create-work-order/reducer.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useCurrencyFormatter } from '@work-orders/common/hooks/use-currency-formatter.js';
import { pick } from '@teifi-digital/shopify-app-toolbox/object';
import { useCalculatedDraftOrderQuery } from '@work-orders/common/queries/use-calculated-draft-order-query.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useToast } from '@teifi-digital/shopify-app-react';

export function WorkOrderSummary({
  createWorkOrder,
  hasUnsavedChanges,
  disabled,
  onSave,
  isSaving,
  onPrint,
}: {
  createWorkOrder: WIPCreateWorkOrder;
  hasUnsavedChanges: boolean;
  disabled: boolean;
  onSave: () => void;
  isSaving: boolean;
  onPrint: () => void;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const currencyFormatter = useCurrencyFormatter({ fetch });

  const calculatedDraftOrderQuery = useCalculatedDraftOrderQuery(
    {
      fetch,
      ...pick(
        createWorkOrder,
        'name',
        'items',
        'charges',
        'discount',
        'customerId',
        'companyLocationId',
        'companyId',
        'companyContactId',
      ),
    },
    { enabled: false },
  );
  const calculatedDraftOrder = calculatedDraftOrderQuery.data;

  let appliedDiscount = BigDecimal.ZERO;

  if (calculatedDraftOrder) {
    appliedDiscount = BigDecimal.fromMoney(calculatedDraftOrder.orderDiscount.applied).add(
      BigDecimal.fromMoney(calculatedDraftOrder.lineItemDiscount.applied),
    );
  }

  const canPrint = createWorkOrder.name && !hasUnsavedChanges;

  return (
    <>
      <BlockStack gap={'400'}>
        {calculatedDraftOrderQuery.isError && (
          <Banner
            title="Error calculating work order"
            tone="warning"
            action={{
              content: 'Retry',
              onAction: () => calculatedDraftOrderQuery.refetch(),
              loading: calculatedDraftOrderQuery.isLoading,
              disabled,
            }}
          >
            {extractErrorMessage(calculatedDraftOrderQuery.error, 'Unknown error')}
          </Banner>
        )}

        {unique(calculatedDraftOrderQuery.data?.warnings ?? []).map(warning => (
          <Banner title="Warning" tone="warning">
            {warning}
          </Banner>
        ))}

        {/*TODO: Show employee names*/}

        <InlineGrid gap={'400'} columns={4}>
          <MoneyField
            label={'Discount'}
            autoComplete={'off'}
            readOnly
            value={(() => {
              if (!createWorkOrder.discount) return '0.00';

              if (createWorkOrder.discount.type === 'FIXED_AMOUNT') {
                return currencyFormatter(createWorkOrder.discount.value);
              }

              if (createWorkOrder.discount.type === 'PERCENTAGE') {
                let value = `${createWorkOrder.discount.value}%`;

                if (calculatedDraftOrder) {
                  const discount = BigDecimal.fromMoney(calculatedDraftOrder.orderDiscount.total).add(
                    BigDecimal.fromMoney(calculatedDraftOrder.lineItemDiscount.total),
                  );

                  const amount = discount.subtract(appliedDiscount);

                  value += ` (${currencyFormatter(amount.round(2).toMoney())})`;
                }

                return value;
              }

              return createWorkOrder.discount satisfies never;
            })()}
            disabled={disabled}
          />

          {appliedDiscount.compare(BigDecimal.ZERO) > 0 && (
            <MoneyField
              label={'Applied Discount'}
              autoComplete={'off'}
              readOnly
              value={appliedDiscount.round(2).toMoney()}
              disabled={disabled}
            />
          )}

          <MoneyField
            label={'Subtotal'}
            autoComplete={'off'}
            readOnly
            value={calculatedDraftOrder?.subtotal}
            disabled={disabled}
          />

          <MoneyField
            label={'Tax'}
            autoComplete={'off'}
            readOnly
            value={calculatedDraftOrder?.tax}
            disabled={disabled}
          />

          <MoneyField
            label={'Total'}
            autoComplete={'off'}
            readOnly
            value={calculatedDraftOrder?.total}
            disabled={disabled}
          />

          <MoneyField
            label={'Paid'}
            autoComplete={'off'}
            readOnly
            value={(() => {
              if (!calculatedDraftOrder) return undefined;
              return BigDecimal.fromMoney(calculatedDraftOrder.total)
                .subtract(BigDecimal.fromMoney(calculatedDraftOrder.outstanding))
                .toMoney();
            })()}
            disabled={disabled}
          />

          <MoneyField
            label={'Balance Due'}
            autoComplete={'off'}
            readOnly
            value={calculatedDraftOrder?.outstanding}
            disabled={disabled}
          />
        </InlineGrid>

        <ButtonGroup fullWidth>
          <Tooltip active={!canPrint} content={'You must save your work order before you can print'} dismissOnMouseOut>
            <Button disabled={disabled || !canPrint} onClick={() => onPrint()}>
              Print
            </Button>
          </Tooltip>
          <Button variant={'primary'} onClick={() => onSave()} loading={isSaving}>
            Save
          </Button>
        </ButtonGroup>
      </BlockStack>

      {toast}
    </>
  );
}
