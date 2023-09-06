const config = require("./webpack.config");

module.exports = {
  ...config,
  mode: "development",
  devtool: false,
  output: {
    ...config.output
  }
};
