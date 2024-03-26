import { CreatePurchaseOrder } from '@web/schemas/generated/create-purchase-order.js';
import { BlockStack, Button, ButtonGroup, InlineGrid, Tooltip } from '@shopify/polaris';
import { MoneyField } from '@web/frontend/components/MoneyField.js';
import { BigDecimal, Money } from '@teifi-digital/shopify-app-toolbox/big-decimal';
import { CreatePurchaseOrderDispatchProxy } from '@work-orders/common/create-purchase-order/reducer.js';

export function Summary({
  createPurchaseOrder,
  dispatch,
  hasUnsavedChanges,
  disabled,
  onSave,
  isSaving,
  onPrint,
}: {
  createPurchaseOrder: CreatePurchaseOrder;
  dispatch: CreatePurchaseOrderDispatchProxy;
  hasUnsavedChanges: boolean;
  disabled: boolean;
  onSave: () => void;
  isSaving: boolean;
  onPrint: () => void;
}) {
  const subtotal = BigDecimal.sum(
    ...createPurchaseOrder.lineItems.map(product =>
      BigDecimal.fromMoney(product.unitCost).multiply(BigDecimal.fromString(product.quantity.toFixed(0))),
    ),
  ).round(2);

  const total = BigDecimal.sum(
    subtotal,
    createPurchaseOrder.tax ? BigDecimal.fromMoney(createPurchaseOrder.tax) : BigDecimal.ZERO,
    createPurchaseOrder.shipping ? BigDecimal.fromMoney(createPurchaseOrder.shipping) : BigDecimal.ZERO,
  )
    .subtract(createPurchaseOrder.discount ? BigDecimal.fromMoney(createPurchaseOrder.discount) : BigDecimal.ZERO)
    .round(2);

  const balanceDue = total
    .subtract(
      BigDecimal.sum(
        createPurchaseOrder.deposited ? BigDecimal.fromMoney(createPurchaseOrder.deposited) : BigDecimal.ZERO,
        createPurchaseOrder.paid ? BigDecimal.fromMoney(createPurchaseOrder.paid) : BigDecimal.ZERO,
      ),
    )
    .round(2);

  const canPrint = createPurchaseOrder.name && !hasUnsavedChanges;

  return (
    <BlockStack gap={'400'}>
      <InlineGrid gap={'400'} columns={4}>
        <MoneyField label={'Subtotal'} autoComplete={'off'} readOnly value={subtotal.toMoney()} disabled={disabled} />

        <MoneyField
          label={'Discount'}
          autoComplete={'off'}
          disabled={disabled}
          value={createPurchaseOrder.discount ?? ''}
          onChange={value =>
            dispatch.setPartial({
              discount: value ? (value as Money) : null,
            })
          }
        />
        <MoneyField
          label={'Tax'}
          autoComplete={'off'}
          disabled={disabled}
          value={createPurchaseOrder.tax ?? ''}
          onChange={value =>
            dispatch.setPartial({
              tax: value ? (value as Money) : null,
            })
          }
        />
        <MoneyField
          label={'Shipping'}
          autoComplete={'off'}
          disabled={disabled}
          value={createPurchaseOrder.shipping ?? ''}
          onChange={value =>
            dispatch.setPartial({
              shipping: value ? (value as Money) : null,
            })
          }
        />
        <MoneyField label={'Total'} autoComplete={'off'} readOnly value={total.toMoney()} disabled={disabled} />

        <MoneyField
          label={'Deposited'}
          autoComplete={'off'}
          disabled={disabled}
          value={createPurchaseOrder.deposited ?? ''}
          onChange={value =>
            dispatch.setPartial({
              deposited: value ? (value as Money) : null,
            })
          }
        />
        <MoneyField
          label={'Paid'}
          autoComplete={'off'}
          disabled={disabled}
          value={createPurchaseOrder.paid ?? ''}
          onChange={value =>
            dispatch.setPartial({
              paid: value ? (value as Money) : null,
            })
          }
        />
        <MoneyField
          label={'Balance Due'}
          autoComplete={'off'}
          readOnly
          value={balanceDue.toMoney()}
          disabled={disabled}
        />
      </InlineGrid>

      <ButtonGroup fullWidth>
        <Tooltip
          active={!canPrint}
          content={'You must save your purchase order before you can print'}
          dismissOnMouseOut
        >
          <Button disabled={disabled || !canPrint} onClick={() => onPrint()}>
            Print
          </Button>
        </Tooltip>
        <Button variant={'primary'} onClick={() => onSave()} loading={isSaving}>
          Save
        </Button>
      </ButtonGroup>
    </BlockStack>
  );
}
