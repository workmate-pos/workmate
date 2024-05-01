export type DiscriminatedUnionPick<T, K extends keyof T> = T extends unknown ? Pick<T, K> : never;
