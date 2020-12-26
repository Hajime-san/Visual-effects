const path = require('path');
const webpack = require('webpack');

module.exports = {
    mode: "development",
    devServer: {
        historyApiFallback: true,
        contentBase: path.join(__dirname, `${process.env.TARGET_PATH}/dist`),
        open: true,
        compress: true,
        hot: true,
        watchContentBase: true,
        port: 9000,
    },
    entry: {
        bundle: path.join(__dirname, `${process.env.TARGET_PATH}/src/ts/app.ts`)
    },
    output: {
        path: path.join(__dirname, `${process.env.TARGET_PATH}/dist`),
        filename: '[name].js',
    },
    resolve: {
        extensions:['.ts','.js']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
            },
        ]
    },
    plugins: [
        new webpack.EnvironmentPlugin({
            TARGET_PATH: ''
        }),
        new webpack.HotModuleReplacementPlugin(),
    ],
    cache: {
        type: 'filesystem',
        buildDependencies: {
            config: [__filename]
        },
    }
}
