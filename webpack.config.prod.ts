/* eslint-disable */
// @ts-ignore
import { vanillaConfig } from "./webpack.config";
import CopyWebpackPlugin from "copy-webpack-plugin";
import path from "path";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";

module.exports = {
  ...vanillaConfig,
  mode: "production",
  output: {
    ...vanillaConfig.output,
    filename: "[name].min.js"
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "npm/index.js"),
          to: path.resolve(__dirname, "lib/index.js")
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
    }),
    new BundleAnalyzerPlugin()
  ]
};
