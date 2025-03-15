/* tslint:disable */
/* eslint-disable */
export class SandwichsFavs {
  private constructor();
  free(): void;
  static describe(): string;
  static calculate(): bigint;
  static get_schema(): string;
  static get_client_req_schema(): string;
  static get_relay_event_schema(): string;
  static get_relay_notice_schema(): string;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_sandwichsfavs_free: (a: number, b: number) => void;
  readonly sandwichsfavs_describe: () => [number, number];
  readonly sandwichsfavs_calculate: () => bigint;
  readonly sandwichsfavs_get_schema: () => [number, number];
  readonly sandwichsfavs_get_client_req_schema: () => [number, number];
  readonly sandwichsfavs_get_relay_event_schema: () => [number, number];
  readonly sandwichsfavs_get_relay_notice_schema: () => [number, number];
  readonly __wbindgen_export_0: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
