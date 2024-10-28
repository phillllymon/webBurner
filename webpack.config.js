const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require('path');

module.exports = {
    entry: {
        main: path.resolve(__dirname, './frontend/input.js'),
    },
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'output')
    }
};