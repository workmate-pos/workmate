/** Types generated for queries found in "services/db/queries/locations.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'Get' parameters type */
export interface IGetParams {
  locationId: string;
}

/** 'Get' return type */
export interface IGetResult {
  createdAt: Date;
  deletedAt: Date | null;
  locationId: string;
  name: string;
  shop: string;
  updatedAt: Date;
}

/** 'Get' query type */
export interface IGetQuery {
  params: IGetParams;
  result: IGetResult;
}

const getIR: any = {"usedParamSet":{"locationId":true},"params":[{"name":"locationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":46,"b":57}]}],"statement":"SELECT *\nFROM \"Location\"\nWHERE \"locationId\" = :locationId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "Location"
 * WHERE "locationId" = :locationId!
 * ```
 */
export const get = new PreparedQuery<IGetParams,IGetResult>(getIR);


/** 'GetMany' parameters type */
export interface IGetManyParams {
  locationIds: readonly (string)[];
}

/** 'GetMany' return type */
export interface IGetManyResult {
  createdAt: Date;
  deletedAt: Date | null;
  locationId: string;
  name: string;
  shop: string;
  updatedAt: Date;
}

/** 'GetMany' query type */
export interface IGetManyQuery {
  params: IGetManyParams;
  result: IGetManyResult;
}

const getManyIR: any = {"usedParamSet":{"locationIds":true},"params":[{"name":"locationIds","required":true,"transform":{"type":"array_spread"},"locs":[{"a":47,"b":59}]}],"statement":"SELECT *\nFROM \"Location\"\nWHERE \"locationId\" IN :locationIds!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "Location"
 * WHERE "locationId" IN :locationIds!
 * ```
 */
export const getMany = new PreparedQuery<IGetManyParams,IGetManyResult>(getManyIR);


/** 'Upsert' parameters type */
export interface IUpsertParams {
  locationId: string;
  name: string;
  shop: string;
}

/** 'Upsert' return type */
export type IUpsertResult = void;

/** 'Upsert' query type */
export interface IUpsertQuery {
  params: IUpsertParams;
  result: IUpsertResult;
}

const upsertIR: any = {"usedParamSet":{"locationId":true,"shop":true,"name":true},"params":[{"name":"locationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":58,"b":69}]},{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":72,"b":77}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":80,"b":85}]}],"statement":"INSERT INTO \"Location\" (\"locationId\", shop, name)\nVALUES (:locationId!, :shop!, :name!)\nON CONFLICT (\"locationId\")\n  DO UPDATE\n  SET shop = EXCLUDED.shop,\n      name = EXCLUDED.name"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "Location" ("locationId", shop, name)
 * VALUES (:locationId!, :shop!, :name!)
 * ON CONFLICT ("locationId")
 *   DO UPDATE
 *   SET shop = EXCLUDED.shop,
 *       name = EXCLUDED.name
 * ```
 */
export const upsert = new PreparedQuery<IUpsertParams,IUpsertResult>(upsertIR);


/** 'UpsertMany' parameters type */
export interface IUpsertManyParams {
  locations: readonly ({
    locationId: string,
    shop: string,
    name: string
  })[];
}

/** 'UpsertMany' return type */
export type IUpsertManyResult = void;

/** 'UpsertMany' query type */
export interface IUpsertManyQuery {
  params: IUpsertManyParams;
  result: IUpsertManyResult;
}

const upsertManyIR: any = {"usedParamSet":{"locations":true},"params":[{"name":"locations","required":false,"transform":{"type":"pick_array_spread","keys":[{"name":"locationId","required":true},{"name":"shop","required":true},{"name":"name","required":true}]},"locs":[{"a":71,"b":80}]}],"statement":"INSERT INTO \"Location\" (\"locationId\", shop, name)\nVALUES ('', '', ''), :locations OFFSET 1\nON CONFLICT (\"locationId\")\n  DO UPDATE\n  SET shop = EXCLUDED.shop,\n      name = EXCLUDED.name"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "Location" ("locationId", shop, name)
 * VALUES ('', '', ''), :locations OFFSET 1
 * ON CONFLICT ("locationId")
 *   DO UPDATE
 *   SET shop = EXCLUDED.shop,
 *       name = EXCLUDED.name
 * ```
 */
export const upsertMany = new PreparedQuery<IUpsertManyParams,IUpsertManyResult>(upsertManyIR);


/** 'SoftDeleteLocations' parameters type */
export interface ISoftDeleteLocationsParams {
  locationIds: readonly (string)[];
}

/** 'SoftDeleteLocations' return type */
export type ISoftDeleteLocationsResult = void;

/** 'SoftDeleteLocations' query type */
export interface ISoftDeleteLocationsQuery {
  params: ISoftDeleteLocationsParams;
  result: ISoftDeleteLocationsResult;
}

const softDeleteLocationsIR: any = {"usedParamSet":{"locationIds":true},"params":[{"name":"locationIds","required":true,"transform":{"type":"array_spread"},"locs":[{"a":64,"b":76}]}],"statement":"UPDATE \"Location\"\nSET \"deletedAt\" = NOW()\nWHERE \"locationId\" IN :locationIds!\nAND \"deletedAt\" IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE "Location"
 * SET "deletedAt" = NOW()
 * WHERE "locationId" IN :locationIds!
 * AND "deletedAt" IS NULL
 * ```
 */
export const softDeleteLocations = new PreparedQuery<ISoftDeleteLocationsParams,ISoftDeleteLocationsResult>(softDeleteLocationsIR);


