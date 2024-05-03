/** Types generated for queries found in "services/db/queries/resync-orders-migration.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type ShopifyOrderType = 'DRAFT_ORDER' | 'ORDER';

/** 'GetAllOrders' parameters type */
export type IGetAllOrdersParams = void;

/** 'GetAllOrders' return type */
export interface IGetAllOrdersResult {
  createdAt: Date;
  customerId: string | null;
  discount: string;
  fullyPaid: boolean;
  name: string;
  orderId: string;
  orderType: ShopifyOrderType;
  outstanding: string;
  shop: string;
  subtotal: string;
  total: string;
  updatedAt: Date;
}

/** 'GetAllOrders' query type */
export interface IGetAllOrdersQuery {
  params: IGetAllOrdersParams;
  result: IGetAllOrdersResult;
}

const getAllOrdersIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT *\nFROM \"ShopifyOrder\""};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "ShopifyOrder"
 * ```
 */
export const getAllOrders = new PreparedQuery<IGetAllOrdersParams,IGetAllOrdersResult>(getAllOrdersIR);


