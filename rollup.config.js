import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import json from 'rollup-plugin-json'
import { terser } from 'rollup-plugin-terser'
import typescript from 'rollup-plugin-typescript'
import builtins from 'builtin-modules'

export default {
  input: './src/extension.ts',
  output: {
    file: 'dist/extension.js',
    format: 'cjs'
  },
  external: builtins,
  plugins: [
    resolve(),
    commonjs(),
    json(),
    typescript(),
    terser()
  ]
}
