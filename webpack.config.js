const path = require('path');

module.exports = {
    mode: 'development',
    devtool: 'source-map',
    entry: './src/pixi-vfui.ts',
    module: {
        rules: [
            {
                test: /pixi.js/,
                use: 'ts-loader'
            },
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: [/node_modules/]
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },
    output: {
        filename: 'pixi-vfui.js',
        library: "pixivfui",
        //libraryTarget: "umd",
        path: path.resolve(__dirname, 'dist')
    },
    devServer: {
        inline: true,
        port: 8089
    }
};
