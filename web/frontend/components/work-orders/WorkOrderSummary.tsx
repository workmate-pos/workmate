import { Banner, BlockStack, Button, ButtonGroup, InlineGrid, List, Tooltip } from '@shopify/polaris';
import { MoneyField } from '@web/frontend/components/MoneyField.js';
import { BigDecimal } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { WIPCreateWorkOrder } from '@work-orders/common/create-work-order/reducer.js';
import { useAuthenticatedFetch } from '@web/frontend/hooks/use-authenticated-fetch.js';
import { useCurrencyFormatter } from '@work-orders/common/hooks/use-currency-formatter.js';
import {
  CalculateWorkOrderError,
  useCalculatedDraftOrderQuery,
} from '@work-orders/common/queries/use-calculated-draft-order-query.js';
import { extractErrorMessage } from '@teifi-digital/shopify-app-toolbox/error';
import { unique } from '@teifi-digital/shopify-app-toolbox/array';
import { useToast } from '@teifi-digital/shopify-app-react';
import { useState } from 'react';
import { WorkOrderSourcingModal } from '@web/frontend/components/work-orders/modals/WorkOrderSourcingModal.js';
import { sentenceCase } from '@teifi-digital/shopify-app-toolbox/string';

export function WorkOrderSummary({
  createWorkOrder,
  hasUnsavedChanges,
  disabled,
  onSave,
  isSaving,
  onPrint,
  onCreateOrder,
}: {
  createWorkOrder: WIPCreateWorkOrder;
  hasUnsavedChanges: boolean;
  disabled: boolean;
  onSave: () => void;
  isSaving: boolean;
  onPrint: () => void;
  onCreateOrder: () => void;
}) {
  const [toast, setToastAction] = useToast();
  const fetch = useAuthenticatedFetch({ setToastAction });
  const currencyFormatter = useCurrencyFormatter({ fetch });

  const calculatedDraftOrderQuery = useCalculatedDraftOrderQuery({ fetch, ...createWorkOrder }, { enabled: false });
  const calculatedDraftOrder = calculatedDraftOrderQuery.data;

  let appliedDiscount = BigDecimal.ZERO;

  if (calculatedDraftOrder) {
    appliedDiscount = BigDecimal.fromMoney(calculatedDraftOrder.orderDiscount.applied).add(
      BigDecimal.fromMoney(calculatedDraftOrder.lineItemDiscount.applied),
    );
  }

  const canPrint = createWorkOrder.name && !hasUnsavedChanges;
  const [isSourcingModalOpen, setIsSourcingModalOpen] = useState(false);

  return (
    <>
      <BlockStack gap={'400'}>
        {calculatedDraftOrderQuery.isError && !(calculatedDraftOrderQuery.error instanceof CalculateWorkOrderError) && (
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

        {calculatedDraftOrderQuery.isError && calculatedDraftOrderQuery.error instanceof CalculateWorkOrderError && (
          <Banner title="Errors calculating work order price" tone="critical">
            <List type="bullet">
              {calculatedDraftOrderQuery.error.errors.map(error => (
                <List.Item key={error.field.join(', ')}>
                  {sentenceCase(error.field.join(' '))}: {error.message}
                </List.Item>
              ))}
            </List>
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
              label={'Applied discount'}
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
            label={'Balance due'}
            autoComplete={'off'}
            readOnly
            value={calculatedDraftOrder?.outstanding}
            disabled={disabled}
          />
        </InlineGrid>

        <ButtonGroup fullWidth>
          <Button disabled={!createWorkOrder.name || hasUnsavedChanges} onClick={() => setIsSourcingModalOpen(true)}>
            Sourcing
          </Button>

          <Tooltip content={canPrint ? '' : 'You must save your work order before you can print'} dismissOnMouseOut>
            <Button disabled={disabled || !canPrint} onClick={() => onPrint()}>
              Print
            </Button>
          </Tooltip>
          {!!createWorkOrder.companyId && (
            <Tooltip
              active={hasUnsavedChanges}
              content={'You must save your work order before you can create orders for it'}
              dismissOnMouseOut
            >
              <Button disabled={disabled || hasUnsavedChanges} onClick={() => onCreateOrder()}>
                Create Unpaid Order
              </Button>
            </Tooltip>
          )}
          <Button variant={'primary'} disabled={disabled} onClick={() => onSave()} loading={isSaving}>
            Save
          </Button>
        </ButtonGroup>
      </BlockStack>

      {createWorkOrder.name && (
        <WorkOrderSourcingModal
          open={isSourcingModalOpen}
          onClose={() => setIsSourcingModalOpen(false)}
          name={createWorkOrder.name}
        />
      )}

      {toast}
    </>
  );
}
