import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/z.js',
  output: {
    file: 'bundle.js',
    format: 'es'
  },
  plugins: [resolve(), commonjs()],
  //   external: [
  //     'js-function-reflector',
  //     'deep-equal',
  //     'flat'
  //   ] 
};
