import { SomeZodObject } from 'zod';

export function getSchemaCsvTemplate(schema: SomeZodObject) {
  const headers = Object.keys(schema.shape);
  const emptyLine = Array.from({ length: headers.length }, () => '');
  return [headers, emptyLine].map(cells => cells.join(',')).join('\n');
}
