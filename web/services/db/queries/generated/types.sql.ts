/** Types generated for queries found in "services/db/queries/types.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetEnums' parameters type */
export type IGetEnumsParams = void;

/** 'GetEnums' return type */
export interface IGetEnumsResult {
  arrayTypeName: string;
  arrayTypeOid: number | null;
  typeName: string;
  typeOid: number | null;
}

/** 'GetEnums' query type */
export interface IGetEnumsQuery {
  params: IGetEnumsParams;
  result: IGetEnumsResult;
}

const getEnumsIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT\n  array_type.typname AS \"arrayTypeName\",\n  array_type.oid :: integer AS \"arrayTypeOid\",\n  elem_type.typname AS \"typeName\",\n  elem_type.oid :: integer AS \"typeOid\"\nFROM pg_type array_type\n       JOIN pg_type elem_type ON array_type.typelem = elem_type.oid\n       JOIN pg_namespace n ON elem_type.typnamespace = n.oid\nWHERE elem_type.typtype = 'e'\n  AND n.nspname NOT IN ('pg_catalog', 'information_schema')\n  AND array_type.typcategory = 'A'"};

/**
 * Query generated from SQL:
 * ```
 * SELECT
 *   array_type.typname AS "arrayTypeName",
 *   array_type.oid :: integer AS "arrayTypeOid",
 *   elem_type.typname AS "typeName",
 *   elem_type.oid :: integer AS "typeOid"
 * FROM pg_type array_type
 *        JOIN pg_type elem_type ON array_type.typelem = elem_type.oid
 *        JOIN pg_namespace n ON elem_type.typnamespace = n.oid
 * WHERE elem_type.typtype = 'e'
 *   AND n.nspname NOT IN ('pg_catalog', 'information_schema')
 *   AND array_type.typcategory = 'A'
 * ```
 */
export const getEnums = new PreparedQuery<IGetEnumsParams,IGetEnumsResult>(getEnumsIR);


