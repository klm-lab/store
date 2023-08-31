type NestedKeyTypes<S> = {
  [Key in keyof S & string]: S[Key] extends  //We exclude other types from suggestions
    | Map<any, any>
    | Date
    | Set<any>
    | Array<any>
    ? Key
    : S[Key] extends object
    ?
        | `${Key}`
        | `${Key}.${NestedKeyTypes<S[Key]> extends infer U extends string
            ? U
            : never}`
    : `${Key}`;
}[keyof S & string];

//Suggestion for group store
type DataOrActionsKeyTypes<S> = {
  [Key in keyof S & string]: `${Key}._A` | `${Key}._D`;
}[keyof S & string];

// suggestion for slice and group store based on storeOptions O
type TargetType<S, O> = O extends StoreOptionsGroup
  ? NestedKeyTypes<S> | DataOrActionsKeyTypes<S>
  : NestedKeyTypes<S> | "_A" | "_D";

type StoreOptionsEverywhere = {
  dispatchMode: "everywhere";
};

type StoreOptionsGroup = {
  storeType: "group";
};

type DefaultStoreOptionsType = {
  storeType?: "group" | "slice";
  dispatchMode?: "hook" | "everywhere";
};

type NotFunctions<S> = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [Key in keyof S & string]: keyof S[Key] extends Function ? string : `${Key}`;
}[keyof S & string];

type DataOnlyType<S> = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [key in NotFunctions<S>]: S[key & keyof S];
};

type OnlyFunctions<S> = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [Key in keyof S & string]: keyof S[Key] extends Function ? `${Key}` : string;
}[keyof S & string];

type FunctionChainType<S> = {
  [key in OnlyFunctions<S>]: (...values: unknown[]) => FunctionChainType<S>;
};

type StoreOutputType<T, K extends string> = K extends keyof T
  ? T[K]
  : K extends `${infer K0}.${infer KR}`
  ? K0 extends keyof T
    ? StoreOutputType<T[K0], KR>
    : never
  : // we infer some type to check our custom suggestion, _A & _D key._A, key._D
  K extends infer F
  ? F extends "_A"
    ? FunctionChainType<T>
    : F extends "_D"
    ? DataOnlyType<T>
    : never
  : never;

/* Interface allow me to override definitions with same name
 * One for optional target which return the generic
 * and one of required target which return type based on target
 * */
// interface StoreFunction<S, O> {
//   <targetKey extends string>(
//     target: targetKey extends TargetType<S, O> ? targetKey : TargetType<S, O>,
//     willDefineLater?: boolean
//   ): StoreOutputType<S, targetKey>;
// }

// interface StoreFunction<S, O> {
//   <targetKey extends string>(
//     target?: targetKey extends TargetType<S, O> ? targetKey : TargetType<S, O>,
//     willDefineLater?: boolean
//   ): S;
// }

type StoreFunction<S, O> = O extends StoreOptionsGroup
  ? {
      <targetKey extends string>(
        target: targetKey extends TargetType<S, O>
          ? targetKey
          : TargetType<S, O>,
        willDefineLater?: boolean
      ): StoreOutputType<S, targetKey>;
    }
  : {
      <targetKey extends string>(
        target?: targetKey extends TargetType<S, O>
          ? targetKey
          : TargetType<S, O>,
        willDefineLater?: boolean
      ): S;
    };

type StoreObject<S, O> = O extends StoreOptionsEverywhere
  ? {
      dispatcher: O extends StoreOptionsGroup
        ? {
            [k in keyof S]: FunctionChainType<S[k]>;
          }
        : FunctionChainType<S>;

      useStore: StoreFunction<S, O>;
    }
  : StoreFunction<S, O>;

type CreateStoreType<S, O> = O extends undefined
  ? StoreFunction<S, O>
  : StoreObject<S, O>;

type StoreDataAndActionsType = {
  store?: any;
  actions?: any;
};

type UserParamsType = {
  paths: string[];
  target?: string;
  willDefineLater?: boolean;
};

type StoreParamsType = {
  store: StoreDataAndActionsType;
  storeType: "slice" | "group";
};

type ErrorType = {
  name: string;
  message: string;
  stack?: string;
  matchKey?: string;
  state?: any;
};

export type {
  CreateStoreType,
  StoreFunction,
  DefaultStoreOptionsType,
  StoreDataAndActionsType,
  UserParamsType,
  StoreParamsType,
  ErrorType
};
