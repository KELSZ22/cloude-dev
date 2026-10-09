declare module "bun:test" {
  interface Expectation {
    not: Expectation;
    toBe(value: unknown): void;
    toEqual(value: unknown): void;
    toHaveLength(value: number): void;
    toContain(value: unknown): void;
    toMatch(value: RegExp | string): void;
    toBeUndefined(): void;
    toBeTruthy(): void;
    toBeNull(): void;
    toBeGreaterThan(value: number): void;
    toBeGreaterThanOrEqual(value: number): void;
    toBeInstanceOf(value: unknown): void;
    toMatchObject(value: unknown): void;
    rejects: Expectation;
    resolves: Expectation;
  }

  interface TestFn {
    (name: string, fn: () => void | Promise<void>, timeout?: number): void;
    skip: TestFn;
  }

  export function describe(name: string, fn: () => void): void;
  export const test: TestFn;
  export function expect(value: unknown): Expectation;
}
