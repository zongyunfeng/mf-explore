import ReactDOM from 'react-dom'
import React, {lazy, Suspense} from 'react'
import {RecoilRoot} from 'recoil'
import FallbackContent from './FallbackContent'
import LoaderContainer from './LoaderContainer'

const Header = lazy(() => import('header/Header'))
const Content = lazy(() => import('content/Content'))

const App = () => {
    return (
        <RecoilRoot>
            <div>
                <Suspense
                    fallback={<FallbackContent text={'正在加载Header'}/>}
                >
                    <Header/>
                </Suspense>

                <Suspense
                    fallback={<FallbackContent text={'正在加载Content'}/>}
                >
                    <Content/>
                </Suspense>

                <LoaderContainer
                    module={'./Footer'}
                    scope={'footer'}
                    url={'http://127.0.0.1:8003/footerComp.js'}
                />
            </div>
        </RecoilRoot>
    )
}

const container = document.createElement('div')
document.body.appendChild(container)
ReactDOM.render(<App/>, container)
