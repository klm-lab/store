const path = require("path");

const config = {
  entry: {
    store: path.resolve(__dirname, "src/index.ts")
  },
  externals: ["react"],
  cache: false,
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        loader: "ts-loader"
      }
    ]
  },
  resolve: { extensions: [".ts"] },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "lib"),
    libraryTarget: "commonjs"
  }
};
module.exports = config;
