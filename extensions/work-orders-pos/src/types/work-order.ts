import type { PaymentType } from '../queries/use-work-order-query.js';

export type WorkOrder = {
  name?: string;
  status: string;
  customer: WorkOrderCustomer;
  price: WorkOrderPrice;
  dueDate: string;
  products: WorkOrderProduct[];
  services: WorkOrderService[];
  employeeAssignments: WorkOrderEmployeeAssignment[];
  description: string;
  payments: WorkOrderPayment[];
  derivedFromOrder?: {
    id: string;
    name: string;
    workOrderName?: string;
  };
};

export type WorkOrderPrice = {
  tax: number;
  discount: number;
  shipping: number;
};

export type WorkOrderProduct = {
  name: string;
  sku: string;
  imageUrl?: string;
  productVariantId: string;
  quantity: number;
  unitPrice: number;
};

export type WorkOrderEmployeeAssignment = {
  name: string;
  employeeId: string;
};

export type WorkOrderCustomer = {
  name: string;
  id: string;
};

export type WorkOrderService = {
  /**
   * UUID used to identify service instances.
   * Required instead of a `quantity` field because services can be added multiple times, but with different employees, etc.
   */
  uuid: string;
  name: string;
  sku: string;
  imageUrl?: string;
  productVariantId: string;
  basePrice: number;
  employeeAssignments: WorkOrderServiceEmployeeAssignment[];
};

export type WorkOrderServiceEmployeeAssignment = {
  name: string;
  employeeId: string;
  employeeRate: number;
  hours: number;
};

export type WorkOrderPayment = {
  type: PaymentType;
  amount: number;
};
