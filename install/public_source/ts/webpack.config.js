const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    controller_admin_page_read: './entry/admin/pages/read.js',
    controller_admin_tag_read: './entry/admin/tags/read.js',
  },
  devtool: 'source-map',
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, '../../public/media/js/dist'),
  },
  module: {
    rules: [
      {
        test: /\.(m?js)|tsx|ts|jsx$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            plugins: [
              '@babel/plugin-transform-runtime'
            ],
            presets: [
              '@babel/preset-env',
              '@babel/preset-react',
              '@babel/preset-typescript'
            ]
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
  },
};