/**
 * True when a numeric field carries a usable number.
 */
export const hasNumber = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined && value !== 0 && !Number.isNaN(value);

/**
 * True when an id or relationship value points at a document/entity.
 */
export const hasRef = <T>(value: T | null | undefined): value is T => {
  if (value === null || value === undefined || value === "" || value === 0) {
    return false;
  }

  return !Number.isNaN(value);
};

/**
 * True when a text field carries usable text.
 */
export const hasText = <T extends string>(
  value: T | null | undefined
): value is T => value !== null && value !== undefined && value.length > 0;

/**
 * True when the value is set, i.e. neither null nor undefined.
 */
export const hasValue = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;

/**
 * The value when it is a usable number, else the fallback.
 */
export const numberOr = (
  value: number | null | undefined,
  fallback: number
): number => {
  if (
    value === null ||
    value === undefined ||
    value === 0 ||
    Number.isNaN(value)
  ) {
    return fallback;
  }

  return value;
};

/**
 * The value when it carries text, else the fallback.
 */
export const textOr = <TFallback>(
  value: string | null | undefined,
  fallback: TFallback
): string | TFallback => (hasText(value) ? value : fallback);
