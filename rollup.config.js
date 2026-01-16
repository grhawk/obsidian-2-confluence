import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/main.ts",
  output: {
    dir: ".",
    format: "cjs",
    sourcemap: "inline"
  },
  external: ["obsidian"],
  plugins: [resolve({ browser: true }), commonjs(), typescript()]
};
