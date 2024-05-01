/**
 * Escapes all instances of a character in a string.
 */
export function escapeCharacter(text: string, character: string): string {
  return text.replace(new RegExp(character, 'g'), '\\' + character);
}

/**
 * Escapes all quotation marks in a string. Handy for certain Shopify GraphQL API queries.
 */
export function escapeQuotationMarks(text: string): string {
  return escapeCharacter(text, '"');
}
