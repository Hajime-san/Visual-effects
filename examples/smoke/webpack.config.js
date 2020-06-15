const path = require('path');

module.exports = {
    devServer: {
        contentBase: path.join(__dirname, './dist'),
        port: 9000
    },
    entry: {
        bundle: path.join(__dirname, './src/ts/app.ts')
    },
    output: {
        path: path.join(__dirname,'./dist'),
        filename: '[name].js'
    },
    resolve: {
        extensions:['.ts','.js']
    },
    module: {
        rules: [
            {
                test:/\.ts$/,loader:'ts-loader'
            },
        ]
    }
}
