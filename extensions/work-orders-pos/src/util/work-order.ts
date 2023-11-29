import type { WorkOrder } from '../screens/WorkOrder';

export function getPriceDetails(workOrder: Partial<WorkOrder>) {
  const price = workOrder.price ?? { tax: 0, discount: 0, shipping: 0 };

  const subTotal = workOrder.products?.map(item => item.unitPrice * item.quantity).reduce((a, b) => a + b, 0) ?? 0;
  const total = subTotal + price.shipping + price.tax - price.discount;
  const paid = workOrder.payments?.reduce((a, b) => a + b.amount, 0) ?? 0;
  const deposited =
    workOrder.payments?.filter(payment => payment.type === 'DEPOSIT').reduce((a, b) => a + b.amount, 0) ?? 0;
  const balanceDue = total - paid;

  return { subTotal, total, paid, balanceDue, deposited };
}
