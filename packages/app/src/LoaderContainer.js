import React, { lazy, Suspense } from 'react'
import useScript from './useScript'
import { loadComponent } from './utils'
import FallbackContent from './FallbackContent'

const LoaderContainer = ({ url, scope, module }) => {
    const { ready, failed } = useScript({
        url: url,
    })

    if (!url) {
        return <h2>没有指定远程依赖</h2>
    }

    if (!ready) {
        return <h2>正在加载远程依赖: {url}</h2>
    }

    if (failed) {
        return <h2>加载远程依赖失败: {url}</h2>
    }

    const Component = lazy(loadComponent(scope, module))

    return (
        <Suspense fallback={<FallbackContent text={'加载远程依赖'} />}>
            <Component />
        </Suspense>
    )
}

export default LoaderContainer
