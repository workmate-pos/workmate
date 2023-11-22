import { PaymentType } from './db/queries/generated/work-order-payment.sql.js';
import { db } from './db/db.js';

function parsePaymentType(paymentType: string): PaymentType {
  switch (paymentType.toLowerCase()) {
    case 'deposit':
      return 'DEPOSIT';
    case 'balance':
      return 'BALANCE';

    default:
      throw new Error(`Unknown payment type: '${paymentType}'`);
  }
}

export async function insertWorkOrderPayment(
  shop: string,
  id: number,
  amount: number,
  workOrderName: string,
  paymentType: string,
) {
  const [workOrder] = await db.workOrder.get({ shop, name: workOrderName });

  if (!workOrder) {
    throw new Error(`Work order not found: { shop: '${shop}', name: '${workOrderName}' }`);
  }

  const type = parsePaymentType(paymentType);

  await db.workOrderPayment.insert({
    type,
    amount,
    workOrderId: workOrder.id,
    orderId: String(id),
  });
}
