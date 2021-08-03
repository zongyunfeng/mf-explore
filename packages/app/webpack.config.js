const {mode} = require('webpack-nano/argv')
const parts = require('./webpack.parts')
const {merge} = require('webpack-merge')

const deps = require('./package.json').dependencies
const sharedDependencies = {
    ...deps,
    react: {singleton: true},
    'react-dom': {singleton: true},
}

const commonConfig = merge([
    parts.basis({mode}),
    parts.loadJavaScript(),
    parts.page({title: 'App'}),
    parts.federateModule({
        name: 'app',
        filename: 'state.js',
        remotes: {
            header: 'header@http://127.0.0.1:8001/headerComp.js',
            content: 'content@http://127.0.0.1:8002/contentComp.js',
        },
        shared: sharedDependencies,
        exposes: {
            './state': './src/atoms',
        },
    }),
])

const productionConfig = merge([])

const developmentConfig = merge([
    {entry: ['webpack-plugin-serve/client']},
    parts.devServer(),
])

const getConfig = (mode) => {
    switch (mode) {
        case 'production':
            return merge([commonConfig, productionConfig])
        case 'development':
            return merge([commonConfig, developmentConfig])
        default:
            throw new Error(`Trying to use an unknown mode, ${mode}`)
    }
}

module.exports = getConfig(mode)
