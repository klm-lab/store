const config = require("./webpack.react.config");

module.exports = {
  ...config,
  mode: "development",
  devtool: false,
  output: {
    ...config.output
  }
};
