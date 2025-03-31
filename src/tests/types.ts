export interface MockFunction<T = unknown, R = unknown> {
  (...args: T[]): R;
  mockImplementation: (fn: (...args: T[]) => R) => void;
  mockResolvedValue: (value: R) => void;
  mockRejectedValue: (error: Error) => void;
}
