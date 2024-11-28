import { Modal, BlockStack, ButtonGroup, Button } from '@shopify/polaris';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { BarcodeTextField } from '../../BarcodeTextField.js';
import { ProductVariant } from '@work-orders/common/queries/use-product-variants-query.js';
import {
  WIPCreateStockTransfer,
  CreateStockTransferDispatchProxy,
} from '@work-orders/common/create-stock-transfer/reducer.js';
import { StockTransferLineItemStatus } from '@web/services/db/queries/generated/stock-transfers.sql.js';
import { CreateStockTransferLineItemStatus } from '@web/schemas/generated/create-stock-transfer.js';
import { ID } from '@teifi-digital/shopify-app-toolbox/shopify';
import { uuid } from '@work-orders/common/util/uuid.js';

type Mode = {
  name: string;
  fromStatus: CreateStockTransferLineItemStatus | null;
  toStatuses: StockTransferLineItemStatus[];
  type: 'add' | 'update';
};

const MODES: Record<string, Mode> = {
  ADD_LINE_ITEMS: {
    name: 'Add line items',
    fromStatus: null,
    toStatuses: ['PENDING', 'IN_TRANSIT'],
    type: 'add',
  },
  SEND_LINE_ITEMS: {
    name: 'Send line items',
    fromStatus: 'PENDING',
    toStatuses: ['IN_TRANSIT'],
    type: 'update',
  },
  RECEIVE_LINE_ITEMS: {
    name: 'Receive line items',
    fromStatus: 'IN_TRANSIT',
    toStatuses: ['RECEIVED', 'REJECTED'],
    type: 'update',
  },
};

type Action = {
  inventoryItemId: ID;
  fromStatus: StockTransferLineItemStatus | null;
  toStatus: StockTransferLineItemStatus;
  quantity: number;
  productTitle: string;
  productVariantTitle: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  createStockTransfer: WIPCreateStockTransfer;
  dispatch: CreateStockTransferDispatchProxy;
};

export function StockTransferLineItemScannerModal({ open, onClose, createStockTransfer, dispatch }: Props) {
  const [selectedMode, setSelectedMode] = useState<Mode>(MODES.ADD_LINE_ITEMS!);
  const [actions, setActions] = useState<Action[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<StockTransferLineItemStatus | null>(null);

  const lineItemsByStatus = useMemo(() => {
    const itemsByStatus: Record<ID, Record<StockTransferLineItemStatus, number>> = {};

    for (const lineItem of createStockTransfer.lineItems) {
      const countByStatus = (itemsByStatus[lineItem.inventoryItemId] ??= {
        PENDING: 0,
        IN_TRANSIT: 0,
        RECEIVED: 0,
        REJECTED: 0,
      });

      countByStatus[lineItem.status] += lineItem.quantity;
    }

    return itemsByStatus;
  }, [createStockTransfer.lineItems]);

  const handleProductScanned = useCallback(
    (variant: ProductVariant) => {
      const inventoryItemId = variant.inventoryItem.id;
      const currentQuantity = selectedMode.fromStatus
        ? (lineItemsByStatus[inventoryItemId]?.[selectedMode.fromStatus] ?? 0)
        : 0;

      // For send/receive mode, check if there are items to update
      if (selectedMode.type === 'update' && currentQuantity === 0) {
        return;
      }

      const toStatus = selectedStatus ?? selectedMode.toStatuses[0];
      if (!toStatus) return;

      setActions(current => {
        const existingAction = current.find(
          action =>
            action.inventoryItemId === inventoryItemId &&
            action.fromStatus === selectedMode.fromStatus &&
            action.toStatus === toStatus,
        );

        if (existingAction) {
          return current.map(action =>
            action === existingAction ? { ...action, quantity: action.quantity + 1 } : action,
          );
        }

        return [
          ...current,
          {
            inventoryItemId,
            fromStatus: selectedMode.fromStatus,
            toStatus,
            quantity: 1,
            productTitle: variant.product.title,
            productVariantTitle: variant.title,
          },
        ];
      });
    },
    [selectedMode, selectedStatus, lineItemsByStatus],
  );

  useEffect(() => {
    setSelectedStatus(selectedMode.toStatuses[0] ?? null);
  }, [selectedMode]);

  const applyActions = useCallback(() => {
    let newCreateStockTransfer = createStockTransfer;

    for (const action of actions) {
      if (selectedMode.type === 'add') {
        const existingLineItem = newCreateStockTransfer.lineItems.find(
          item => item.inventoryItemId === action.inventoryItemId && item.status === action.toStatus,
        );

        if (existingLineItem) {
          newCreateStockTransfer = {
            ...newCreateStockTransfer,
            lineItems: newCreateStockTransfer.lineItems.map(item =>
              item === existingLineItem ? { ...item, quantity: item.quantity + action.quantity } : item,
            ),
          };
        } else {
          newCreateStockTransfer = {
            ...newCreateStockTransfer,
            lineItems: [
              ...newCreateStockTransfer.lineItems,
              {
                uuid: uuid(),
                inventoryItemId: action.inventoryItemId,
                status: action.toStatus,
                quantity: action.quantity,
                productTitle: action.productTitle,
                productVariantTitle: action.productVariantTitle,
                shopifyOrderLineItem: null,
                purchaseOrderLineItem: null,
              },
            ],
          };
        }
      } else {
        // Send / Receive (update) items mode
        let remainingQuantityToUpdate = action.quantity;
        let updatedLineItems = [...newCreateStockTransfer.lineItems];

        let targetLineItem = updatedLineItems.find(
          item => item.inventoryItemId === action.inventoryItemId && item.status === action.toStatus,
        );

        if (!targetLineItem) {
          targetLineItem = {
            uuid: uuid(),
            inventoryItemId: action.inventoryItemId,
            status: action.toStatus,
            quantity: 0,
            productTitle: action.productTitle,
            productVariantTitle: action.productVariantTitle,
            shopifyOrderLineItem: null,
            purchaseOrderLineItem: null,
          };
          updatedLineItems.push(targetLineItem);
        }

        updatedLineItems = updatedLineItems
          .map(lineItem => {
            if (
              lineItem.inventoryItemId === action.inventoryItemId &&
              lineItem.status === action.fromStatus &&
              lineItem.quantity > 0 &&
              remainingQuantityToUpdate > 0
            ) {
              const quantityToUpdate = Math.min(remainingQuantityToUpdate, lineItem.quantity);
              remainingQuantityToUpdate -= quantityToUpdate;

              if (lineItem !== targetLineItem) {
                targetLineItem.quantity += quantityToUpdate;
              }

              return {
                ...lineItem,
                quantity: lineItem.quantity - quantityToUpdate,
              };
            }
            return lineItem;
          })
          .filter(lineItem => lineItem.quantity > 0);

        newCreateStockTransfer = {
          ...newCreateStockTransfer,
          lineItems: updatedLineItems,
        };
      }
    }

    dispatch.set(newCreateStockTransfer);
    setActions([]);
    onClose();
  }, [actions, createStockTransfer, dispatch, onClose, selectedMode.type]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Scan Items"
      primaryAction={{
        content: 'Apply Changes',
        onAction: applyActions,
        disabled: actions.length === 0,
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: onClose,
        },
      ]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <ButtonGroup fullWidth>
            {Object.values(MODES).map(mode => (
              <Button
                key={mode.name}
                pressed={selectedMode.name === mode.name}
                onClick={() => {
                  setSelectedMode(mode);
                  setActions([]);
                }}
              >
                {mode.name}
              </Button>
            ))}
          </ButtonGroup>

          {selectedMode.toStatuses.length > 1 && (
            <ButtonGroup fullWidth>
              {selectedMode.toStatuses.map(status => (
                <Button key={status} pressed={selectedStatus === status} onClick={() => setSelectedStatus(status)}>
                  {status}
                </Button>
              ))}
            </ButtonGroup>
          )}

          <BarcodeTextField onProductScanned={handleProductScanned} showFieldLabel showHelpText />
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
