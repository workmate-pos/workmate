/** Types generated for queries found in "services/db/queries/products.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

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
  title: string;
}

/** 'Upsert' return type */
export type IUpsertResult = void;

/** 'Upsert' query type */
export interface IUpsertQuery {
  params: IUpsertParams;
  result: IUpsertResult;
}

const upsertIR: any = {"usedParamSet":{"productId":true,"handle":true,"title":true,"shop":true,"description":true,"productType":true},"params":[{"name":"productId","required":true,"transform":{"type":"scalar"},"locs":[{"a":93,"b":103}]},{"name":"handle","required":true,"transform":{"type":"scalar"},"locs":[{"a":106,"b":113},{"a":214,"b":221}]},{"name":"title","required":true,"transform":{"type":"scalar"},"locs":[{"a":116,"b":122},{"a":239,"b":245}]},{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":125,"b":130},{"a":263,"b":268}]},{"name":"description","required":true,"transform":{"type":"scalar"},"locs":[{"a":133,"b":145},{"a":291,"b":303}]},{"name":"productType","required":true,"transform":{"type":"scalar"},"locs":[{"a":148,"b":160},{"a":328,"b":340}]}],"statement":"INSERT INTO \"Product\" (\"productId\", handle, title, shop, description, \"productType\")\nVALUES (:productId!, :handle!, :title!, :shop!, :description!, :productType!)\nON CONFLICT (\"productId\") DO UPDATE\n  SET handle = :handle!,\n      title  = :title!,\n      shop   = :shop!,\n      description = :description!,\n      \"productType\" = :productType!"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "Product" ("productId", handle, title, shop, description, "productType")
 * VALUES (:productId!, :handle!, :title!, :shop!, :description!, :productType!)
 * ON CONFLICT ("productId") DO UPDATE
 *   SET handle = :handle!,
 *       title  = :title!,
 *       shop   = :shop!,
 *       description = :description!,
 *       "productType" = :productType!
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


