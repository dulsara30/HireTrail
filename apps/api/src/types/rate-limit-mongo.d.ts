declare module 'rate-limit-mongo' {
  import { Store, Options, IncrementResponse } from 'express-rate-limit';

  interface MongoStoreOptions {
    uri: string;
    collectionName?: string;
    expireTimeMs?: number;
    resetExpireDateOnChange?: boolean;
    errorHandler?: (error: unknown) => void;
  }

  class MongoStore implements Store {
    constructor(options: MongoStoreOptions);
    init?: (options: Options) => void;
    get?: (key: string) => Promise<IncrementResponse | undefined> | IncrementResponse | undefined;
    increment: (key: string) => Promise<IncrementResponse> | IncrementResponse;
    decrement: (key: string) => Promise<void> | void;
    resetKey: (key: string) => Promise<void> | void;
    resetAll?: () => Promise<void> | void;
  }

  export default MongoStore;
}
