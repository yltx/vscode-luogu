import * as vscode from 'vscode';
import { result, schemas, transformers } from './schemas';

/**
 * @warning **Haven't been tested!** Please test it before use it.
 */
export function getStorage<K extends keyof schemas>(
  context: vscode.ExtensionContext,
  key: K
): result[K] {
  const dat = context.globalState.get(key, {
    version: -1,
    data: undefined
  }) as {
    version: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
  };
  if (dat.version < transformers[key].length - 1) {
    while (dat.version < transformers[key].length - 1)
      dat.data = transformers[key][++dat.version](dat.data);
    setStorage(context, key, dat.data);
  }
  return dat.data;
}
/**
 * @warning **Haven't been tested!** Please test it before use it.
 */
export function setStorage<K extends keyof schemas>(
  context: vscode.ExtensionContext,
  key: K,
  value: result[K]
) {
  return context.globalState.update(key, {
    version: transformers[key].length - 1,
    data: value
  });
}
