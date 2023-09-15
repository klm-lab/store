/* eslint-disable */
// @ts-ignore
import { reactConfig } from "./webpack.react.config";

module.exports = {
  ...reactConfig,
  mode: "development",
  devtool: false,
  output: {
    ...reactConfig.output
  }
};
