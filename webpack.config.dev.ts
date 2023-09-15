/* eslint-disable */
// @ts-ignore
import { vanillaConfig } from "./webpack.config";

module.exports = {
  ...vanillaConfig,
  mode: "development",
  devtool: false,
  output: {
    ...vanillaConfig.output
  }
};
