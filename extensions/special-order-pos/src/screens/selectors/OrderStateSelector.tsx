import { ListPopup } from '@work-orders/common-pos/screens/ListPopup.js';
import { OrderState } from '@web/schemas/generated/special-order-pagination-options.js';
import { useRouter } from '../../routes.js';
import { sentenceCase, titleCase } from '@teifi-digital/shopify-app-toolbox/string';
import { isNonNullable } from '@teifi-digital/shopify-app-toolbox/guards';

const ORDER_STATES: OrderState[] = ['fully-ordered', 'not-fully-ordered'];

export function OrderStateSelector({
  onSelect,
  onClear,
}: {
  onSelect: (state: OrderState) => void;
  onClear?: () => void;
}) {
  return (
    <ListPopup
      title={'Select order state'}
      selection={{
        type: 'select',
        items: [
          onClear
            ? ({
                id: '',
                leftSide: { label: 'Clear' },
              } as const)
            : null,
          ...ORDER_STATES.map(state => ({
            id: state,
            leftSide: { label: sentenceCase(state) },
          })),
        ].filter(isNonNullable),
        onSelect: state => (state === '' ? onClear?.() : onSelect(state)),
      }}
      useRouter={useRouter}
    />
  );
}
