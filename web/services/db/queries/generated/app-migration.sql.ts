/** Types generated for queries found in "services/db/queries/app-migration.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type AppMigrationStatus = 'FAILURE' | 'PENDING' | 'SUCCESS';

/** 'Insert' parameters type */
export interface IInsertParams {
  checksum: string;
  name: string;
  status: AppMigrationStatus;
}

/** 'Insert' return type */
export interface IInsertResult {
  checksum: string;
  createdAt: Date;
  name: string;
  status: AppMigrationStatus;
  updatedAt: Date;
}

/** 'Insert' query type */
export interface IInsertQuery {
  params: IInsertParams;
  result: IInsertResult;
}

const insertIR: any = {"usedParamSet":{"name":true,"checksum":true,"status":true},"params":[{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":60,"b":65}]},{"name":"checksum","required":true,"transform":{"type":"scalar"},"locs":[{"a":68,"b":77}]},{"name":"status","required":true,"transform":{"type":"scalar"},"locs":[{"a":80,"b":87}]}],"statement":"INSERT INTO \"AppMigration\" (name, checksum, status)\nVALUES (:name!, :checksum!, :status!)\nRETURNING *"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO "AppMigration" (name, checksum, status)
 * VALUES (:name!, :checksum!, :status!)
 * RETURNING *
 * ```
 */
export const insert = new PreparedQuery<IInsertParams,IInsertResult>(insertIR);


/** 'UpdateStatus' parameters type */
export interface IUpdateStatusParams {
  name: string;
  status: AppMigrationStatus;
}

/** 'UpdateStatus' return type */
export interface IUpdateStatusResult {
  checksum: string;
  createdAt: Date;
  name: string;
  status: AppMigrationStatus;
  updatedAt: Date;
}

/** 'UpdateStatus' query type */
export interface IUpdateStatusQuery {
  params: IUpdateStatusParams;
  result: IUpdateStatusResult;
}

const updateStatusIR: any = {"usedParamSet":{"status":true,"name":true},"params":[{"name":"status","required":true,"transform":{"type":"scalar"},"locs":[{"a":35,"b":42}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":57,"b":62}]}],"statement":"UPDATE \"AppMigration\"\nSET status = :status!\nWHERE name = :name!\nRETURNING *"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE "AppMigration"
 * SET status = :status!
 * WHERE name = :name!
 * RETURNING *
 * ```
 */
export const updateStatus = new PreparedQuery<IUpdateStatusParams,IUpdateStatusResult>(updateStatusIR);


/** 'GetAll' parameters type */
export type IGetAllParams = void;

/** 'GetAll' return type */
export interface IGetAllResult {
  checksum: string;
  createdAt: Date;
  name: string;
  status: AppMigrationStatus;
  updatedAt: Date;
}

/** 'GetAll' query type */
export interface IGetAllQuery {
  params: IGetAllParams;
  result: IGetAllResult;
}

const getAllIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT *\nFROM \"AppMigration\""};

/**
 * Query generated from SQL:
 * ```
 * SELECT *
 * FROM "AppMigration"
 * ```
 */
export const getAll = new PreparedQuery<IGetAllParams,IGetAllResult>(getAllIR);


