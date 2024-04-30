/** Types generated for queries found in "services/db/queries/customers.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'Get' parameters type */
export interface IGetParams {
  customerId: string;
}

/** 'Get' return type */
export interface IGetResult {
  address: string | null;
  createdAt: Date;
  customerId: string;
  deletedAt: Date | null;
  displayName: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  shop: string;
  updatedAt: Date;
}

/** 'Get' query type */
export interface IGetQuery {
  params: IGetParams;
  result: IGetResult;
}

const getIR: any = {"usedParamSet":{"customerId":true},"params":[{"name":"customerId","required":true,"transform":{"type":"scalar"},"locs":[{"a":46,"b":57}]}],"statement":"SELECT *\nFROM \"Customer\"\nWHERE \"customerId\" = :customerId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "Customer"
 * WHERE "customerId" = :customerId!
 * ```
 */
export const get = new PreparedQuery<IGetParams,IGetResult>(getIR);


/** 'GetMany' parameters type */
export interface IGetManyParams {
  customerIds: readonly (string)[];
}

/** 'GetMany' return type */
export interface IGetManyResult {
  address: string | null;
  createdAt: Date;
  customerId: string;
  deletedAt: Date | null;
  displayName: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  shop: string;
  updatedAt: Date;
}

/** 'GetMany' query type */
export interface IGetManyQuery {
  params: IGetManyParams;
  result: IGetManyResult;
}

const getManyIR: any = {"usedParamSet":{"customerIds":true},"params":[{"name":"customerIds","required":true,"transform":{"type":"array_spread"},"locs":[{"a":47,"b":59}]}],"statement":"SELECT *\nFROM \"Customer\"\nWHERE \"customerId\" IN :customerIds!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "Customer"
 * WHERE "customerId" IN :customerIds!
 * ```
 */
export const getMany = new PreparedQuery<IGetManyParams,IGetManyResult>(getManyIR);


/** 'Upsert' parameters type */
export interface IUpsertParams {
  address?: string | null | void;
  customerId: string;
  displayName: string;
  email?: string | null | void;
  firstName?: string | null | void;
  lastName?: string | null | void;
  phone?: string | null | void;
  shop: string;
}

/** 'Upsert' return type */
export type IUpsertResult = void;

/** 'Upsert' query type */
export interface IUpsertQuery {
  params: IUpsertParams;
  result: IUpsertResult;
}

const upsertIR: any = {"usedParamSet":{"customerId":true,"shop":true,"displayName":true,"firstName":true,"lastName":true,"email":true,"phone":true,"address":true},"params":[{"name":"customerId","required":true,"transform":{"type":"scalar"},"locs":[{"a":115,"b":126}]},{"name":"shop","required":true,"transform":{"type":"scalar"},"locs":[{"a":129,"b":134}]},{"name":"displayName","required":true,"transform":{"type":"scalar"},"locs":[{"a":137,"b":149}]},{"name":"firstName","required":false,"transform":{"type":"scalar"},"locs":[{"a":152,"b":161}]},{"name":"lastName","required":false,"transform":{"type":"scalar"},"locs":[{"a":164,"b":172}]},{"name":"email","required":false,"transform":{"type":"scalar"},"locs":[{"a":175,"b":180}]},{"name":"phone","required":false,"transform":{"type":"scalar"},"locs":[{"a":183,"b":188}]},{"name":"address","required":false,"transform":{"type":"scalar"},"locs":[{"a":191,"b":198}]}],"statement":"INSERT INTO \"Customer\" (\"customerId\", shop, \"displayName\", \"firstName\", \"lastName\", email, phone, address)\nVALUES (:customerId!, :shop!, :displayName!, :firstName, :lastName, :email, :phone, :address)\nON CONFLICT (\"customerId\") DO UPDATE\n  SET shop          = EXCLUDED.shop,\n      \"displayName\" = EXCLUDED.\"displayName\",\n      \"firstName\"   = EXCLUDED.\"firstName\",\n      \"lastName\"    = EXCLUDED.\"lastName\",\n      email         = EXCLUDED.email,\n      phone         = EXCLUDED.phone,\n      address       = EXCLUDED.address"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "Customer" ("customerId", shop, "displayName", "firstName", "lastName", email, phone, address)
 * VALUES (:customerId!, :shop!, :displayName!, :firstName, :lastName, :email, :phone, :address)
 * ON CONFLICT ("customerId") DO UPDATE
 *   SET shop          = EXCLUDED.shop,
 *       "displayName" = EXCLUDED."displayName",
 *       "firstName"   = EXCLUDED."firstName",
 *       "lastName"    = EXCLUDED."lastName",
 *       email         = EXCLUDED.email,
 *       phone         = EXCLUDED.phone,
 *       address       = EXCLUDED.address
 * ```
 */
export const upsert = new PreparedQuery<IUpsertParams,IUpsertResult>(upsertIR);


/** 'UpsertMany' parameters type */
export interface IUpsertManyParams {
  customers: readonly ({
    customerId: string,
    shop: string,
    displayName: string,
    firstName: string | null | void,
    lastName: string | null | void,
    email: string | null | void,
    phone: string | null | void,
    address: string | null | void
  })[];
}

/** 'UpsertMany' return type */
export type IUpsertManyResult = void;

/** 'UpsertMany' query type */
export interface IUpsertManyQuery {
  params: IUpsertManyParams;
  result: IUpsertManyResult;
}

const upsertManyIR: any = {"usedParamSet":{"customers":true},"params":[{"name":"customers","required":false,"transform":{"type":"pick_array_spread","keys":[{"name":"customerId","required":true},{"name":"shop","required":true},{"name":"displayName","required":true},{"name":"firstName","required":false},{"name":"lastName","required":false},{"name":"email","required":false},{"name":"phone","required":false},{"name":"address","required":false}]},"locs":[{"a":148,"b":157}]}],"statement":"INSERT INTO \"Customer\" (\"customerId\", shop, \"displayName\", \"firstName\", \"lastName\", email, phone, address)\nVALUES ('', '', '', '', '', '', '', ''), :customers OFFSET 1\nON CONFLICT (\"customerId\") DO UPDATE\n  SET shop          = EXCLUDED.shop,\n      \"displayName\" = EXCLUDED.\"displayName\",\n      \"firstName\"   = EXCLUDED.\"firstName\",\n      \"lastName\"    = EXCLUDED.\"lastName\",\n      email         = EXCLUDED.email,\n      phone         = EXCLUDED.phone,\n      address       = EXCLUDED.address"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "Customer" ("customerId", shop, "displayName", "firstName", "lastName", email, phone, address)
 * VALUES ('', '', '', '', '', '', '', ''), :customers OFFSET 1
 * ON CONFLICT ("customerId") DO UPDATE
 *   SET shop          = EXCLUDED.shop,
 *       "displayName" = EXCLUDED."displayName",
 *       "firstName"   = EXCLUDED."firstName",
 *       "lastName"    = EXCLUDED."lastName",
 *       email         = EXCLUDED.email,
 *       phone         = EXCLUDED.phone,
 *       address       = EXCLUDED.address
 * ```
 */
export const upsertMany = new PreparedQuery<IUpsertManyParams,IUpsertManyResult>(upsertManyIR);


/** 'SoftDeleteCustomers' parameters type */
export interface ISoftDeleteCustomersParams {
  customerIds: readonly (string)[];
}

/** 'SoftDeleteCustomers' return type */
export type ISoftDeleteCustomersResult = void;

/** 'SoftDeleteCustomers' query type */
export interface ISoftDeleteCustomersQuery {
  params: ISoftDeleteCustomersParams;
  result: ISoftDeleteCustomersResult;
}

const softDeleteCustomersIR: any = {"usedParamSet":{"customerIds":true},"params":[{"name":"customerIds","required":true,"transform":{"type":"array_spread"},"locs":[{"a":64,"b":76}]}],"statement":"UPDATE \"Customer\"\nSET \"deletedAt\" = NOW()\nWHERE \"customerId\" IN :customerIds!\nAND \"deletedAt\" IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE "Customer"
 * SET "deletedAt" = NOW()
 * WHERE "customerId" IN :customerIds!
 * AND "deletedAt" IS NULL
 * ```
 */
export const softDeleteCustomers = new PreparedQuery<ISoftDeleteCustomersParams,ISoftDeleteCustomersResult>(softDeleteCustomersIR);


