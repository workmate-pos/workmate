import { BadgeProps } from '@shopify/polaris';
import { CycleCountApplicationStatus } from '@web/services/cycle-count/types.js';

export function getCycleCountApplicationStateBadge(
  applicationStatus: CycleCountApplicationStatus,
  quantities?: {
    countQuantity: number;
    appliedQuantity: number;
  },
): BadgeProps {
  const changed = quantities?.appliedQuantity !== quantities?.countQuantity;

  if (applicationStatus === 'not-applied') {
    return { children: 'Not applied', tone: 'warning', progress: 'incomplete' };
  }

  if (applicationStatus === 'partially-applied' || (applicationStatus === 'applied' && changed)) {
    let text = 'Partially applied';

    if (quantities) {
      text += ` (${quantities.appliedQuantity})`;
    }

    return { children: text, tone: 'warning', progress: 'partiallyComplete' };
  }

  if (applicationStatus === 'applied') {
    return { children: 'Applied', tone: 'success', progress: 'complete' };
  }

  return applicationStatus satisfies never;
}
