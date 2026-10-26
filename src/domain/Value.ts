export class Value {
  static number(value: string | number, name: string): number {
    const result = typeof value === 'number' ? value : Number(value);
    if ((typeof value === 'string' && !value.trim()) || !Number.isFinite(result)) {
      throw new Error(`${name} must be a finite number`);
    }
    return Object.is(result, -0) ? 0 : result;
  }

  static nonnegative(value: string | number, name: string): number {
    const result = this.number(value, name);
    if (result < 0) throw new Error(`${name} must be nonnegative`);
    return result;
  }

  static positive(value: string | number, name: string): number {
    const result = this.number(value, name);
    if (result <= 0) throw new Error(`${name} must be positive`);
    return result;
  }
}
