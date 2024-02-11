/** Types generated for queries found in "services/db/queries/sequence.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetNextSequenceValue' parameters type */
export interface IGetNextSequenceValueParams {
  sequenceName: string;
}

/** 'GetNextSequenceValue' return type */
export interface IGetNextSequenceValueResult {
  id: number;
}

/** 'GetNextSequenceValue' query type */
export interface IGetNextSequenceValueQuery {
  params: IGetNextSequenceValueParams;
  result: IGetNextSequenceValueResult;
}

const getNextSequenceValueIR: any = {"usedParamSet":{"sequenceName":true},"params":[{"name":"sequenceName","required":true,"transform":{"type":"scalar"},"locs":[{"a":28,"b":41}]}],"statement":"SELECT NEXTVAL(FORMAT('%I', :sequenceName! :: TEXT)) :: INTEGER AS \"id!\""};

/**
 * Query generated from SQL:
 * ```
 * SELECT NEXTVAL(FORMAT('%I', :sequenceName! :: TEXT)) :: INTEGER AS "id!"
 * ```
 */
export const getNextSequenceValue = new PreparedQuery<IGetNextSequenceValueParams,IGetNextSequenceValueResult>(getNextSequenceValueIR);


