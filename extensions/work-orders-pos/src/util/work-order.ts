import type { WorkOrder } from '../types/work-order';

export function getPriceDetails(workOrder: Partial<WorkOrder>) {
  const price = workOrder.price ?? { tax: 0, discount: 0, shipping: 0 };

  const products = workOrder.products?.map(item => item.unitPrice * item.quantity).reduce((a, b) => a + b, 0) ?? 0;
  const services =
    workOrder.services
      ?.map(
        item =>
          item.basePrice +
          item.employeeAssignments.reduce((total, { hours, employeeRate }) => total + hours * employeeRate, 0),
      )
      .reduce((a, b) => a + b, 0) ?? 0;

  const subTotal = products + services;
  const total = subTotal + price.shipping + price.tax - price.discount;
  const paid = workOrder.payments?.reduce((a, b) => a + b.amount, 0) ?? 0;
  const deposited =
    workOrder.payments?.filter(payment => payment.type === 'DEPOSIT').reduce((a, b) => a + b.amount, 0) ?? 0;
  const balanceDue = total - paid;

  return { products, services, subTotal, total, paid, balanceDue, deposited };
}
