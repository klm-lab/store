/* eslint-disable */
// @ts-ignore
import { config } from "./webpack.config";
import CopyWebpackPlugin from "copy-webpack-plugin";
import path from "path";
// import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";

config.entry.store.filename = "store.min.js";
config.entry.react.filename = "react/store.min.js";

module.exports = {
  ...config,
  mode: "production",
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "npm/index.js"),
          to: path.resolve(__dirname, "lib/index.js")
        },
        {
          from: path.resolve(__dirname, "npm/index.js"),
          to: path.resolve(__dirname, "lib/react/index.js")
        },
        {
          from: path.resolve(__dirname, "package.json"),
          to: path.resolve(__dirname, "lib/package.json")
        },
        {
          from: path.resolve(__dirname, "README.md"),
          to: path.resolve(__dirname, "lib/README.md")
        }
      ]
    })
    // new BundleAnalyzerPlugin()
  ]
};
