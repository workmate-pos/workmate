import { sql, sqlOne } from '../../sql-tag.js';
import { getWorkOrderTypeCount } from '../../../work-orders/queries.js';

/**
 * Read the sequences used to generate work order ids and move them to the WorkOrderCounter table.
 */
export default async function migrate() {
  const workOrderSequences = await sql<{ sequence_name: string | null }>`
    SELECT s.sequence_name :: text
    FROM information_schema.sequences s
    WHERE s.sequence_name ILIKE 'IdSeq_%'
  `;

  for (const { sequence_name } of workOrderSequences) {
    if (typeof sequence_name !== 'string') {
      throw new Error('Expected sequence_name to be a string');
    }

    const shop = sequence_name.replace('IdSeq_', '');
    // ensure the counter is created
    await getWorkOrderTypeCount({ shop, type: 'Work Order' });
    const { nextval } = await sqlOne<{ nextval: number | null }>`
      SELECT nextval(${`"${sequence_name}"`}) :: int as nextval`;

    if (typeof nextval !== 'number') {
      throw new Error('Expected nextval to be a number');
    }

    await sql`
      UPDATE "WorkOrderTypeCounter"
      SET last_value = ${nextval - 1}
      WHERE shop = ${shop}
        AND type = 'Work Order';
    `;
  }
}
