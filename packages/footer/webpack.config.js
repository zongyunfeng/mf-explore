const {mode, component} = require('webpack-nano/argv')
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
            publicPath: "http://127.0.0.1:8003/",
            // clean: true
        },
    },
    parts.loadJavaScript(),
    {
        entry: [path.join(__dirname, "src", "bootstrap.js")],
    },
    parts.page({title: 'Footer'}),
    parts.federateModule({
        name: "footer",
        filename: "footerComp.js",
        shared: sharedDependencies,
        exposes: {"./Footer": "./src/Footer"},
        remotes: {
            footer: "footer@http://127.0.0.1:8003/footerComp.js"
        }
    }),
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

module.exports = getConfig(mode, component)
