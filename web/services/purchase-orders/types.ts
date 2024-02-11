import { CreatePurchaseOrder } from '../../schemas/generated/create-purchase-order.js';
import { IGetPageResult } from '../db/queries/generated/purchase-order.sql.js';

export type PurchaseOrder = CreatePurchaseOrder;

export type PurchaseOrderInfo = IGetPageResult;
