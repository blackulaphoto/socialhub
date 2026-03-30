import { vi } from "vitest";

export function createThenableChain<T>(result: T) {
  const promise = Promise.resolve(result);
  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit: vi.fn(() => promise),
    orderBy: vi.fn(() => promise),
    leftJoin: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    groupBy: vi.fn(() => chain),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };
  return chain;
}

export function createInsertChain<T>(result: T) {
  const promise = Promise.resolve(result);
  const chain: any = {
    values: vi.fn(() => chain),
    returning: vi.fn(() => promise),
    onConflictDoNothing: vi.fn(() => promise),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };
  return chain;
}

export function createDeleteChain<T>(result: T) {
  const promise = Promise.resolve(result);
  const chain: any = {
    where: vi.fn(() => promise),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };
  return chain;
}
