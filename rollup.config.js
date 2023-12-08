const nodeResolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const typescript = require("@rollup/plugin-typescript");
const terser = require("@rollup/plugin-terser");
const copy = require("rollup-plugin-copy");
const plugins = [
  nodeResolve(),
  commonjs(),
  typescript({ tsconfig: "./tsconfig.json" })
];
module.exports = [
  {
    input: "./src/store/index.ts",
    output: [
      {
        file: "lib/index.js",
        format: "cjs",
        plugins: [terser()]
      },
      {
        file: "lib/index.mjs",
        format: "esm",
        plugins: [
          terser({
            compress: true,
            ecma: 2020,
            module: true
          })
        ]
      }
    ],
    plugins: plugins,
    external: [/node_modules/]
  },
  {
    input: "./src/react/index.ts",
    output: [
      {
        file: "lib/react/index.js",
        format: "cjs",
        plugins: [terser()]
      },
      {
        file: "lib/react/index.mjs",
        format: "esm",
        plugins: [
          terser({
            compress: true,
            ecma: 2020,
            module: true
          })
        ]
      }
    ],
    plugins: [
      ...plugins,
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
