const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const toml = require("toml");
const yaml = require("yamljs");
const json5 = require("json5");

module.exports = {
  mode: "development",
  entry: {
    main: "./src/index.js",
  },
  output: {
    // publicPath: "/",
    path: path.resolve(__dirname, "../build"),
    // filename: "[name].[contenthash].bundle.js",
    filename: "[name].bundle.js",
    clean: true,
  },
  // Tradeoff choice for development builds.
  // devtool: "eval-cheap-module-source-map",
  // Recommended choice for development builds with high quality SourceMaps.
  devtool: "eval-source-map",
  devServer: {
    static: path.join(__dirname, "../build"),
    compress: true,
    port: 3000,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          // transpiling our JavaScript files using Babel and webpack
          loader: "babel-loader",
        },
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: "asset/resource",
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: "asset/resource",
      },
      {
        test: /\.(csv|tsv)$/i,
        use: ["csv-loader"],
      },
      {
        test: /\.xml$/i,
        use: ["xml-loader"],
      },
      {
        test: /\.toml$/i,
        type: "json",
        parser: {
          parse: toml.parse,
        },
      },
      {
        test: /\.yaml$/i,
        type: "json",
        parser: {
          parse: yaml.parse,
        },
      },
      {
        test: /\.json5$/i,
        type: "json",
        parser: {
          parse: json5.parse,
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      filename: "index.html",
    }),
  ],
};
