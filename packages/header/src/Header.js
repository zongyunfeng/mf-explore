import React from 'react'
import { counter } from 'state/state'
import { useRecoilState } from 'recoil'

const Header = () => {
    const [count, setCount] = useRecoilState(counter)
    return (
        <header>
            <h1>计数器Header</h1>
            <span>{`当前数量是：${count}`}</span>
            <button onClick={() => setCount(0)}>重置</button>
        </header>
    )
}

export default Header
