type StoreKeys<S> = {
  [Key in keyof S & string]: S[Key] extends
    | Map<any, any>
    | Date
    | Set<any>
    | Array<any>
    ? Key
    : S[Key] extends object
    ? `${Key}` | `${Key}.${StoreKeys<S[Key]>}`
    : `${Key}`;
}[keyof S & string];

type StoreDataKey<S> = "*" | StoreKeys<S>;

type StoreDataByTarget<S, K> = K extends keyof S
  ? S[K]
  : K extends `${infer FirstKey}.${infer SecondKey}`
  ? FirstKey extends keyof S
    ? StoreDataByTarget<S[FirstKey], SecondKey>
    : never
  : CustomSuggestionType<S, K>;

type CustomSuggestionType<S, K> = K extends "*" ? S : never;

type SubscribeType = {
  [k in string]: Set<FunctionType>;
};

type Util = {
  get: FunctionType;
  sub: FunctionType;
};

type FunctionType = (...args: any) => any;

interface GetStoreRef<S> {
  (storeRef: S): void;
}

interface StoreType<S> {
  set(getStoreRef: GetStoreRef<S>): void;

  get<Target>(
    target: Target extends StoreDataKey<S> ? Target : StoreDataKey<S>
  ): StoreDataByTarget<S, Target>;

  get(): S;

  listen<Target>(
    target: Target extends StoreDataKey<S> ? Target : StoreDataKey<S>,
    callback: (data: StoreDataByTarget<S, Target>) => void
  ): () => void;

  <Target>(
    target: Target extends StoreDataKey<S> ? Target : StoreDataKey<S>
  ): StoreDataByTarget<S, Target>;

  (): S;
}

export type { StoreType, FunctionType, SubscribeType, Util };
