/** Types generated for queries found in "services/db/queries/product-variants.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'Get' parameters type */
export interface IGetParams {
  productVariantId: string;
}

/** 'Get' return type */
export interface IGetResult {
  createdAt: Date;
  deletedAt: Date | null;
  inventoryItemId: string;
  productId: string;
  productVariantId: string;
  sku: string | null;
  title: string | null;
  updatedAt: Date;
}

/** 'Get' query type */
export interface IGetQuery {
  params: IGetParams;
  result: IGetResult;
}

const getIR: any = {"usedParamSet":{"productVariantId":true},"params":[{"name":"productVariantId","required":true,"transform":{"type":"scalar"},"locs":[{"a":58,"b":75}]}],"statement":"SELECT *\nFROM \"ProductVariant\"\nWHERE \"productVariantId\" = :productVariantId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "ProductVariant"
 * WHERE "productVariantId" = :productVariantId!
 * ```
 */
export const get = new PreparedQuery<IGetParams,IGetResult>(getIR);


/** 'GetMany' parameters type */
export interface IGetManyParams {
  productVariantIds: readonly (string)[];
}

/** 'GetMany' return type */
export interface IGetManyResult {
  createdAt: Date;
  deletedAt: Date | null;
  inventoryItemId: string;
  productId: string;
  productVariantId: string;
  sku: string | null;
  title: string | null;
  updatedAt: Date;
}

/** 'GetMany' query type */
export interface IGetManyQuery {
  params: IGetManyParams;
  result: IGetManyResult;
}

const getManyIR: any = {"usedParamSet":{"productVariantIds":true},"params":[{"name":"productVariantIds","required":true,"transform":{"type":"array_spread"},"locs":[{"a":59,"b":77}]}],"statement":"SELECT *\nFROM \"ProductVariant\"\nWHERE \"productVariantId\" IN :productVariantIds!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "ProductVariant"
 * WHERE "productVariantId" IN :productVariantIds!
 * ```
 */
export const getMany = new PreparedQuery<IGetManyParams,IGetManyResult>(getManyIR);


/** 'Upsert' parameters type */
export interface IUpsertParams {
  inventoryItemId: string;
  productId: string;
  productVariantId: string;
  sku?: string | null | void;
  title?: string | null | void;
}

/** 'Upsert' return type */
export type IUpsertResult = void;

/** 'Upsert' query type */
export interface IUpsertQuery {
  params: IUpsertParams;
  result: IUpsertResult;
}

const upsertIR: any = {"usedParamSet":{"productVariantId":true,"productId":true,"inventoryItemId":true,"sku":true,"title":true},"params":[{"name":"productVariantId","required":true,"transform":{"type":"scalar"},"locs":[{"a":102,"b":119}]},{"name":"productId","required":true,"transform":{"type":"scalar"},"locs":[{"a":122,"b":132},{"a":239,"b":249}]},{"name":"inventoryItemId","required":true,"transform":{"type":"scalar"},"locs":[{"a":135,"b":151},{"a":278,"b":294}]},{"name":"sku","required":false,"transform":{"type":"scalar"},"locs":[{"a":154,"b":157},{"a":323,"b":326}]},{"name":"title","required":false,"transform":{"type":"scalar"},"locs":[{"a":160,"b":165},{"a":355,"b":360}]}],"statement":"INSERT INTO \"ProductVariant\" (\"productVariantId\", \"productId\", \"inventoryItemId\", sku, title)\nVALUES (:productVariantId!, :productId!, :inventoryItemId!, :sku, :title)\nON CONFLICT (\"productVariantId\")\n  DO UPDATE\n  SET \"productId\"       = :productId!,\n      \"inventoryItemId\" = :inventoryItemId!,\n      sku               = :sku,\n      title             = :title"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "ProductVariant" ("productVariantId", "productId", "inventoryItemId", sku, title)
 * VALUES (:productVariantId!, :productId!, :inventoryItemId!, :sku, :title)
 * ON CONFLICT ("productVariantId")
 *   DO UPDATE
 *   SET "productId"       = :productId!,
 *       "inventoryItemId" = :inventoryItemId!,
 *       sku               = :sku,
 *       title             = :title
 * ```
 */
export const upsert = new PreparedQuery<IUpsertParams,IUpsertResult>(upsertIR);


/** 'SoftDeleteProductVariants' parameters type */
export interface ISoftDeleteProductVariantsParams {
  productVariantIds: readonly (string)[];
}

/** 'SoftDeleteProductVariants' return type */
export type ISoftDeleteProductVariantsResult = void;

/** 'SoftDeleteProductVariants' query type */
export interface ISoftDeleteProductVariantsQuery {
  params: ISoftDeleteProductVariantsParams;
  result: ISoftDeleteProductVariantsResult;
}

const softDeleteProductVariantsIR: any = {"usedParamSet":{"productVariantIds":true},"params":[{"name":"productVariantIds","required":true,"transform":{"type":"array_spread"},"locs":[{"a":76,"b":94}]}],"statement":"UPDATE \"ProductVariant\"\nSET \"deletedAt\" = NOW()\nWHERE \"productVariantId\" IN :productVariantIds!\nAND \"deletedAt\" IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE "ProductVariant"
 * SET "deletedAt" = NOW()
 * WHERE "productVariantId" IN :productVariantIds!
 * AND "deletedAt" IS NULL
 * ```
 */
export const softDeleteProductVariants = new PreparedQuery<ISoftDeleteProductVariantsParams,ISoftDeleteProductVariantsResult>(softDeleteProductVariantsIR);


/** 'SoftDeleteProductVariantsByProductId' parameters type */
export interface ISoftDeleteProductVariantsByProductIdParams {
  productId: string;
}

/** 'SoftDeleteProductVariantsByProductId' return type */
export type ISoftDeleteProductVariantsByProductIdResult = void;

/** 'SoftDeleteProductVariantsByProductId' query type */
export interface ISoftDeleteProductVariantsByProductIdQuery {
  params: ISoftDeleteProductVariantsByProductIdParams;
  result: ISoftDeleteProductVariantsByProductIdResult;
}

const softDeleteProductVariantsByProductIdIR: any = {"usedParamSet":{"productId":true},"params":[{"name":"productId","required":true,"transform":{"type":"scalar"},"locs":[{"a":68,"b":78}]}],"statement":"UPDATE \"ProductVariant\"\nSET \"deletedAt\" = NOW()\nWHERE \"productId\" = :productId!\nAND \"deletedAt\" IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE "ProductVariant"
 * SET "deletedAt" = NOW()
 * WHERE "productId" = :productId!
 * AND "deletedAt" IS NULL
 * ```
 */
export const softDeleteProductVariantsByProductId = new PreparedQuery<ISoftDeleteProductVariantsByProductIdParams,ISoftDeleteProductVariantsByProductIdResult>(softDeleteProductVariantsByProductIdIR);


