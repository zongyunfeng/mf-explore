const {mode, component} = require('webpack-nano/argv')
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
    parts.page({title: 'Header'}),
    parts.federateModule({
        name: 'header',
        filename: 'headerComp.js',
        remotes: {
            header: 'header@http://127.0.0.1:8001/headerComp.js',
            state: "app@http://127.0.0.1:8000/state.js"
        },
        shared: sharedDependencies,
        exposes: {'./Header': './src/Header'},
    }),
])

const productionConfig = merge([])

const developmentConfig = merge([
    {entry: ['webpack-plugin-serve/client']},
    parts.devServer(),
])

// const developmentConfig = merge([])

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

module.exports = getConfig(mode, component)
