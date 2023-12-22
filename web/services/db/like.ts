export function escapeLike(pattern: string) {
  return pattern.replace(/[%_]/g, '\\$&');
}
