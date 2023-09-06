const config = require("./webpack.config");
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
    })
  ]
};
