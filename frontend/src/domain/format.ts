/** O backend devolve float (4.0). Mostra 4, 2.5, 0.75 sem zeros sobrando. */
export function formatWeight(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(6)));
}

/** "A, B e C" */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

export function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}
