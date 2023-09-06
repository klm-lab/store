const config = require("./webpack.react.config");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require("path");

module.exports = {
  ...config,
  mode: "production",
  output: {
    ...config.output,
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
