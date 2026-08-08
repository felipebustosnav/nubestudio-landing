/**
 * The statement scene publishes its progress here so the nav can decide when to
 * step aside. Replaces the prototype's `window.__stmtProgress`.
 */
let current = 0;

export const getStatementProgress = (): number => current;

export const setStatementProgress = (value: number): void => {
  current = value;
};
