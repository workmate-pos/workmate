import { ListPopup } from '@work-orders/common-pos/screens/ListPopup.js';
import { PurchaseOrderState } from '@web/schemas/generated/special-order-pagination-options.js';
import { useRouter } from '../../routes.js';
import { titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';

const PURCHASE_ORDER_STATES: PurchaseOrderState[] = ['ALL_RECEIVED', 'NOT_ALL_RECEIVED'];

export function PurchaseOrderStateSelector({
  onSelect,
  onClear,
}: {
  onSelect: (state: PurchaseOrderState) => void;
  onClear?: () => void;
}) {
  return (
    <ListPopup
      title={'Select purchase order state'}
      selection={{
        type: 'select',
        items: [
          onClear
            ? ({
                id: '',
                leftSide: { label: 'Clear' },
              } as const)
            : null,
          ...PURCHASE_ORDER_STATES.map(state => ({
            id: state,
            leftSide: { label: titleCase(state) },
          })),
        ].filter(isNonNullable),
        onSelect: state => (state === '' ? onClear?.() : onSelect(state)),
      }}
      useRouter={useRouter}
    />
  );
}
