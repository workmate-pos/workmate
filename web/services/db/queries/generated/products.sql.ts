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

const upsertIR: any = {"usedParamSet":{"productId":true,"handle":true,"title":true,"shop":true,"description":true},"params":[{"name":"productId","required":true,"transform":{"type":"scalar"},"locs":[{"a":78,"b":88}]},{"name":"handle","required":true,"transform":{"type":"scalar"},"locs":[{"a":91,"b":98},{"a":184,"b":191}]},{"name":"title","required":true,"transform":{"type":"scalar"},"locs":[{"a":101,"b":107},{"a":209,"b":215}]},{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":110,"b":115},{"a":233,"b":238}]},{"name":"description","required":true,"transform":{"type":"scalar"},"locs":[{"a":118,"b":130},{"a":261,"b":273}]}],"statement":"INSERT INTO \"Product\" (\"productId\", handle, title, shop, description)\nVALUES (:productId!, :handle!, :title!, :shop!, :description!)\nON CONFLICT (\"productId\") DO UPDATE\n  SET handle = :handle!,\n      title  = :title!,\n      shop   = :shop!,\n      description = :description!"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "Product" ("productId", handle, title, shop, description)
 * VALUES (:productId!, :handle!, :title!, :shop!, :description!)
 * ON CONFLICT ("productId") DO UPDATE
 *   SET handle = :handle!,
 *       title  = :title!,
 *       shop   = :shop!,
 *       description = :description!
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


