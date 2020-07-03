const path = require('path');
const webpack = require('webpack');


if (process.env.NODE_ENV !== 'production') {
    module.exports.devtool = 'inline-source-map';
}

module.exports = {
    devServer: {
        contentBase: path.join(__dirname, `${process.env.TARGET_PATH}/dist`),
        port: 9000,
        watchContentBase: true,
        open: true,
    },
    entry: {
        bundle: path.join(__dirname, `${process.env.TARGET_PATH}/src/ts/app.ts`)
    },
    output: {
        path: path.join(__dirname, `${process.env.TARGET_PATH}/dist`),
        filename: '[name].js',
        library: 'Calc',
        libraryTarget: 'umd',
        globalObject: "typeof self !== 'undefined' ? self : this",
    },
    resolve: {
        extensions:['.ts','.js']
    },
    module: {
        rules: [
            {
                enforce: 'pre',
                test: /\.ts$/,
                exclude: /(node_modules)/,
                use: [
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-env'],
                        },
                    },
                    {
                        loader: 'ts-loader',
                    },
                    {
                        loader: 'eslint-loader',
                        options: {
                            fix: true,
                        },
                    },
                    // {
                    //     test: /\.(glsl|vs|fs|vert|frag)$/,
                    //     loader: 'shader-loader',
                    //     // options: {
                    //     //     glsl: {
                    //     //         chunkPath: './src/glsl-chunks'
                    //     //     }
                    //     // }
                    // }
                ],
            },
        ]
    },
    plugins: [
        new webpack.EnvironmentPlugin({
          TARGET_PATH: ''
        })
    ],
}
