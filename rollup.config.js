const nodeResolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const typescript = require("@rollup/plugin-typescript");
const terser = require("@rollup/plugin-terser");
const copy = require("rollup-plugin-copy");

module.exports = [
  {
    input: "./src/index.ts",
    output: [
      // {
      //   file: "lib/index.js",
      //   format: "cjs"
      // },
      {
        file: "lib/index.js",
        format: "cjs",
        plugins: [terser()]
      },
      // {
      //   file: "lib/index.esm.js",
      //   format: "esm"
      // },
      {
        file: "lib/index.mjs",
        format: "esm",
        plugins: [terser()]
      }
    ],
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript({ tsconfig: "./tsconfig.json" })
    ],
    external: [/node_modules/]
  },
  {
    input: "./src/react/index.ts",
    output: [
      // {
      //   file: "lib/react/index.js",
      //   format: "cjs"
      // },
      {
        file: "lib/react/index.js",
        format: "cjs",
        plugins: [terser()]
      },
      // {
      //   file: "lib/react/index.esm.js",
      //   format: "esm"
      // },
      {
        file: "lib/react/index.mjs",
        format: "esm",
        plugins: [terser()]
      }
    ],
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript({ tsconfig: "./tsconfig.json" }),
      copy({
        targets: [
          { src: "./package.json", dest: "lib/" },
          { src: "./README.md", dest: "lib/" }
        ]
      })
    ],
    external: ["react", "react-dom", /node_modules/]
  }
];
