/**
 * Extracts an error message from a thrown error with an unknown type
 */
export function extractErrorMessage(error: unknown, backup: string = 'An unknown error occurred') {
  if (error instanceof Error) {
    return error.message || backup;
  }

  if (typeof error === 'string') {
    return error || backup;
  }

  return backup;
}
