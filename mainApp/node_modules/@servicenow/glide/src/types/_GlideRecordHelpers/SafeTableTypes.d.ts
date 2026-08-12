/**
 * Helper types to safely access table fields when T might not be in Tables interface.
 */

/**
 * Returns the table fields if T is a known table, otherwise returns an empty object.
 */
export type SafeTableFields<T extends string> = T extends keyof Tables
  ? Tables[T]
  : {};

/**
 * Returns the field keys if T is a known table, otherwise returns string.
 */
export type SafeTableFieldKey<T extends string> = T extends keyof Tables
    ? keyof Tables[T]
    : string;

/**
 * Returns the field value type if both T and F are known, otherwise returns any.
 */
export type SafeTableField<T extends string, F extends string> = T extends keyof Tables
  ? F extends keyof Tables[T]
    ? Tables[T][F]
    : any
  : any;

