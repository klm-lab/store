const config = require("./webpack.config");

module.exports = {
  ...config,
  mode: "development",
  devtool: false,
  output: {
    ...config.output,
    clean: true // <-- we clean once on dev build
  }
};
