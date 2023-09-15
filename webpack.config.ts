import path from "path";

const vanillaConfig = {
  entry: {
    store: path.resolve(__dirname, "src/index.ts")
  },
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
export { vanillaConfig };
