/* eslint-disable */
// @ts-ignore
import { reactConfig } from "./webpack.react.config";
import CopyWebpackPlugin from "copy-webpack-plugin";
import path from "path";

module.exports = {
  ...reactConfig,
  mode: "production",
  output: {
    ...reactConfig.output,
    filename: "[name].min.js"
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "npm/index.js"),
          to: path.resolve(__dirname, "lib/react/index.js")
        }
      ]
    })
  ]
};
