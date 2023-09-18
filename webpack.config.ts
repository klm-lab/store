import path from "path";

const config = {
  entry: {
    store: {
      import: "./src/index.ts",
      filename: "store.js"
    },
    react: {
      import: "./src/react/index.ts",
      filename: "react/store.js"
    }
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
    libraryTarget: "commonjs",
    path: path.resolve(__dirname, "lib")
  }
};

export { config };
