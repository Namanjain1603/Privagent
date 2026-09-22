const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const webpack = require('webpack');

module.exports = {
  mode: 'production',
  entry: {
    background: './src/background/service-worker.ts',
    content: './src/content/content-script.ts',
    popup: './popup/popup.ts',
    offscreen: './src/offscreen/offscreen.ts'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: { transpileOnly: true }
          }
        ],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.WS_URL': JSON.stringify(process.env.WS_URL || 'ws://127.0.0.1:3000')
    }),
    new CopyPlugin({
      patterns: [
        { from: "manifest.json", to: "manifest.json" },
        { from: "popup/popup.html", to: "popup.html" },
        { from: "popup/popup.css", to: "popup.css" },
        { from: "src/offscreen/offscreen.html", to: "offscreen.html" },
        { from: "assets/tesseract", to: "assets/tesseract" }
      ],
    }),
  ],
};
