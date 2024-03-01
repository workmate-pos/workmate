export function stringLengthValidator({ min }: { min: number }) {
  return (str: string) => {
    if (str.length < min) return `Must be at least ${min} characters`;
    return null;
  };
}
