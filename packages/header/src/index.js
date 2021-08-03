import ReactDOM from 'react-dom'
import React from 'react'
import Header from 'header/Header'
import { RecoilRoot } from 'recoil'

const container = document.createElement('div')
document.body.appendChild(container)
ReactDOM.render(
    <RecoilRoot>
        <Header />
    </RecoilRoot>,
    container
)
