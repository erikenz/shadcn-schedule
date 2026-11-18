/**
 * The element at `index`. Throws when the element is missing, so a test that
 * indexes past the end of a list fails loudly instead of silently comparing
 * against `undefined`.
 */
export const elementAt = <T>(list: readonly T[], index: number): T => {
  const element = list[index];

  if (element === undefined) {
    throw new Error(
      `Expected an element at index ${index}, but the list has ${list.length}`
    );
  }

  return element;
};
