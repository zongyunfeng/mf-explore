const {mode} = require('webpack-nano/argv')
const parts = require('./webpack.parts')
const {merge} = require('webpack-merge')
const path = require("path");


const deps = require("./package.json").dependencies;
const sharedDependencies = {
    ...deps,
    react: {singleton: true},
    "react-dom": {singleton: true},
};

const commonConfig = merge([
    {
        mode,
        output: {
            publicPath: "http://127.0.0.1:8002/",
            // clean: true
        },
    },
    parts.loadJavaScript(),
    {
        entry: [path.join(__dirname, "src", "bootstrap.js")],
    },
    parts.page({title: 'Main'}),
    parts.federateModule({
        name: "content",
        filename: "contentComp.js",
        remotes: {
            content: "content@http://127.0.0.1:8002/contentComp.js",
            state: "app@http://127.0.0.1:8000/state.js"
        },
        shared: sharedDependencies,
        exposes: {
            "./Content": "./src/Content"
        }
    })
])

const productionConfig = merge([])

const developmentConfig = merge([
    {entry: ["webpack-plugin-serve/client"]},
    parts.devServer()
])

// const developmentConfig = merge([])

const getConfig = (mode, component) => {
    switch (mode) {
        case 'production':
            return merge([commonConfig, productionConfig])
        case 'development':
            return merge([commonConfig, developmentConfig])
        default:
            throw new Error(`Trying to use an unknown mode, ${mode}`);
    }
}

module.exports = getConfig(mode)
