import { sql, sqlOne } from '../../sql-tag.js';

/**
 * Read the sequences used to generate:
 * - work order names
 * - purchase order names
 * - stock transfer names
 */
export default async function migrate() {
  const workOrderSequences = await sql<{ sequence_name: string | null }>`
    SELECT s.sequence_name :: text
    FROM information_schema.sequences s
    WHERE s.sequence_name ILIKE 'IdSeq\_%'
      AND s.sequence_name NOT ILIKE 'IdSeq\_PO\_%'
      AND s.sequence_name NOT ILIKE 'IdSeq\_ST\_%'
  `;

  const purchaseOrderSequences = await sql<{ sequence_name: string | null }>`
    SELECT s.sequence_name :: text
    FROM information_schema.sequences s
    WHERE s.sequence_name ILIKE 'IdSeq\_PO\_%'
  `;

  const stockTransferSequences = await sql<{ sequence_name: string | null }>`
    SELECT s.sequence_name :: text
    FROM information_schema.sequences s
    WHERE s.sequence_name ILIKE 'IdSeq\_ST\_%'
  `;

  for (const { counterPrefix, sequencePrefix, sequences } of [
    { counterPrefix: 'work-order', sequencePrefix: 'IdSeq', sequences: workOrderSequences },
    { counterPrefix: 'purchase-order', sequencePrefix: 'IdSeq_PO', sequences: purchaseOrderSequences },
    { counterPrefix: 'stock-transfer', sequencePrefix: 'IdSeq_ST', sequences: stockTransferSequences },
  ]) {
    for (const { sequence_name } of sequences) {
      if (typeof sequence_name !== 'string') {
        throw new Error('Expected sequence_name to be a string');
      }

      const shop = sequence_name.replace(`${sequencePrefix}_`, '');
      const { nextval } = await sqlOne<{ nextval: number | null }>`
        SELECT nextval(${`"${sequence_name}"`}) :: int as nextval`;

      if (typeof nextval !== 'number') {
        throw new Error('Expected nextval to be a number');
      }

      const key = `${counterPrefix}.${shop}`;

      await sql`
        INSERT INTO "Counter" (key, last_value)
        VALUES (${key}, ${nextval - 1});
      `;
    }
  }
}
