/** Types generated for queries found in "services/db/queries/products.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

/** 'Get' parameters type */
export interface IGetParams {
  productId: string;
}

/** 'Get' return type */
export interface IGetResult {
  createdAt: Date;
  deletedAt: Date | null;
  description: string;
  handle: string;
  productId: string;
  productType: string;
  shop: string;
  shopifyUpdatedAt: Date;
  title: string;
  updatedAt: Date;
}

/** 'Get' query type */
export interface IGetQuery {
  params: IGetParams;
  result: IGetResult;
}

const getIR: any = {"usedParamSet":{"productId":true},"params":[{"name":"productId","required":true,"transform":{"type":"scalar"},"locs":[{"a":44,"b":54}]}],"statement":"SELECT *\nFROM \"Product\"\nWHERE \"productId\" = :productId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "Product"
 * WHERE "productId" = :productId!
 * ```
 */
export const get = new PreparedQuery<IGetParams,IGetResult>(getIR);


/** 'GetMany' parameters type */
export interface IGetManyParams {
  productIds: readonly (string)[];
}

/** 'GetMany' return type */
export interface IGetManyResult {
  createdAt: Date;
  deletedAt: Date | null;
  description: string;
  handle: string;
  productId: string;
  productType: string;
  productVariantCount: number;
  shop: string;
  shopifyUpdatedAt: Date;
  title: string;
  updatedAt: Date;
}

/** 'GetMany' query type */
export interface IGetManyQuery {
  params: IGetManyParams;
  result: IGetManyResult;
}

const getManyIR: any = {"usedParamSet":{"productIds":true},"params":[{"name":"productIds","required":true,"transform":{"type":"array_spread"},"locs":[{"a":235,"b":246}]}],"statement":"SELECT \"Product\".*, COALESCE(COUNT(\"ProductVariant\".\"productId\"), 0) :: INTEGER AS \"productVariantCount!\"\nFROM \"Product\"\nLEFT JOIN \"ProductVariant\" ON \"ProductVariant\".\"productId\" = \"Product\".\"productId\"\nWHERE \"Product\".\"productId\" IN :productIds!\nGROUP BY \"Product\".\"productId\""};

/**
 * Query generated from SQL:
 * ```
 * SELECT "Product".*, COALESCE(COUNT("ProductVariant"."productId"), 0) :: INTEGER AS "productVariantCount!"
 * FROM "Product"
 * LEFT JOIN "ProductVariant" ON "ProductVariant"."productId" = "Product"."productId"
 * WHERE "Product"."productId" IN :productIds!
 * GROUP BY "Product"."productId"
 * ```
 */
export const getMany = new PreparedQuery<IGetManyParams,IGetManyResult>(getManyIR);


/** 'Upsert' parameters type */
export interface IUpsertParams {
  description: string;
  handle: string;
  productId: string;
  productType: string;
  shop: string;
  shopifyUpdatedAt: DateOrString;
  title: string;
}

/** 'Upsert' return type */
export type IUpsertResult = void;

/** 'Upsert' query type */
export interface IUpsertQuery {
  params: IUpsertParams;
  result: IUpsertResult;
}

const upsertIR: any = {"usedParamSet":{"productId":true,"handle":true,"title":true,"shop":true,"description":true,"productType":true,"shopifyUpdatedAt":true},"params":[{"name":"productId","required":true,"transform":{"type":"scalar"},"locs":[{"a":113,"b":123}]},{"name":"handle","required":true,"transform":{"type":"scalar"},"locs":[{"a":126,"b":133}]},{"name":"title","required":true,"transform":{"type":"scalar"},"locs":[{"a":136,"b":142}]},{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":145,"b":150}]},{"name":"description","required":true,"transform":{"type":"scalar"},"locs":[{"a":153,"b":165}]},{"name":"productType","required":true,"transform":{"type":"scalar"},"locs":[{"a":168,"b":180}]},{"name":"shopifyUpdatedAt","required":true,"transform":{"type":"scalar"},"locs":[{"a":183,"b":200}]}],"statement":"INSERT INTO \"Product\" (\"productId\", handle, title, shop, description, \"productType\", \"shopifyUpdatedAt\")\nVALUES (:productId!, :handle!, :title!, :shop!, :description!, :productType!, :shopifyUpdatedAt!)\nON CONFLICT (\"productId\") DO UPDATE\n  SET handle = EXCLUDED.handle,\n      title  = EXCLUDED.title,\n      shop   = EXCLUDED.shop,\n      description = EXCLUDED.description,\n      \"productType\" = EXCLUDED.\"productType\",\n      \"shopifyUpdatedAt\" = EXCLUDED.\"shopifyUpdatedAt\""};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "Product" ("productId", handle, title, shop, description, "productType", "shopifyUpdatedAt")
 * VALUES (:productId!, :handle!, :title!, :shop!, :description!, :productType!, :shopifyUpdatedAt!)
 * ON CONFLICT ("productId") DO UPDATE
 *   SET handle = EXCLUDED.handle,
 *       title  = EXCLUDED.title,
 *       shop   = EXCLUDED.shop,
 *       description = EXCLUDED.description,
 *       "productType" = EXCLUDED."productType",
 *       "shopifyUpdatedAt" = EXCLUDED."shopifyUpdatedAt"
 * ```
 */
export const upsert = new PreparedQuery<IUpsertParams,IUpsertResult>(upsertIR);


/** 'SoftDeleteProducts' parameters type */
export interface ISoftDeleteProductsParams {
  productIds: readonly (string)[];
}

/** 'SoftDeleteProducts' return type */
export type ISoftDeleteProductsResult = void;

/** 'SoftDeleteProducts' query type */
export interface ISoftDeleteProductsQuery {
  params: ISoftDeleteProductsParams;
  result: ISoftDeleteProductsResult;
}

const softDeleteProductsIR: any = {"usedParamSet":{"productIds":true},"params":[{"name":"productIds","required":true,"transform":{"type":"array_spread"},"locs":[{"a":62,"b":73}]}],"statement":"UPDATE \"Product\"\nSET \"deletedAt\" = NOW()\nWHERE \"productId\" IN :productIds!\nAND \"deletedAt\" IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE "Product"
 * SET "deletedAt" = NOW()
 * WHERE "productId" IN :productIds!
 * AND "deletedAt" IS NULL
 * ```
 */
export const softDeleteProducts = new PreparedQuery<ISoftDeleteProductsParams,ISoftDeleteProductsResult>(softDeleteProductsIR);


