type StoreKeys<S> = {
  [Key in keyof S & string]: S[Key] extends
    | Map<any, any>
    | Date
    | Set<any>
    | Array<any>
    ? Key
    : S[Key] extends FunctionType
    ? never
    : S[Key] extends object
    ? `${Key}` | `${Key}.${StoreKeys<S[Key]>}`
    : `${Key}`;
}[keyof S & string];

type StoreDataKey<S> = "*" | StoreKeys<S>;

/*
 * When the value is null, key doesn't appear.
 * So we explicitly check for null and force the key to appear
 * */
type ExcludeFunctions<S, Null = null> = {
  // [Key in keyof S]: S[Key] extends FunctionType ? never : Key;
  [Key in keyof S]: S[Key] extends FunctionType
    ? S[Key] extends Null
      ? Key
      : never
    : Key;
}[keyof S];

type StoreData<S> = {
  [key in ExcludeFunctions<S>]: S[key];
};

type IncludeFunctions<S, Null = null> = {
  // [Key in keyof S]: S[Key] extends FunctionType ? Key : never;
  [Key in keyof S]: S[Key] extends FunctionType
    ? S[Key] extends Null
      ? never
      : Key
    : never;
}[keyof S];

type StoreActions<S> = {
  [key in IncludeFunctions<S>]: (...values: unknown[]) => StoreActions<S>;
};

type StoreDataByTarget<S, K> = K extends keyof S
  ? keyof S[K] extends FunctionType
    ? never
    : S[K]
  : K extends `${infer FirstKey}.${infer SecondKey}`
  ? FirstKey extends keyof S
    ? StoreDataByTarget<S[FirstKey], SecondKey>
    : never
  : CustomSuggestionType<S, K>;

type CustomSuggestionType<S, K> = K extends "*" ? StoreData<S> : never;

type SubscribeType = {
  [k in string]: Set<FunctionType>;
};

type FunctionType = (...args: any) => any;
// type MixedFunctionType = (...args: any) => Promise<void> | any;
type DispatchType = (event: string) => void;

interface StoreType<S> {
  getSnapshot<Target>(
    target: Target extends StoreDataKey<S> ? Target : StoreDataKey<S>
  ): StoreDataByTarget<S, Target>;

  getSnapshot(): StoreData<S>;

  actions: StoreActions<S>;

  listen<Target>(
    event: Target extends StoreDataKey<S> ? Target : StoreDataKey<S>,
    callback: (data: StoreDataByTarget<S, Target>) => void
  ): () => void;

  // <Target extends StoreDataKey<S>[]>(
  //   ...target: Target
  // ): Target extends [string]
  //   ? StoreDataByTarget<S, Target[keyof Target]>
  //   : Target extends []
  //   ? StoreData<S>
  //   : { [Key in keyof Target]: StoreDataByTarget<S, Target[Key]> };
  <Target>(
    target: Target extends StoreDataKey<S> ? Target : StoreDataKey<S>
  ): StoreDataByTarget<S, Target>;

  (): StoreData<S>;
}

export type { StoreType, FunctionType, SubscribeType, DispatchType };
