import React from "react";
import {counter} from "state/state";
import {useRecoilState} from "recoil";

const Content = () => {
    const [count, setCount] = useRecoilState(counter)
    return (
        <main>
            <span>计数器Content</span>
            <div>
                <span>{count}</span>
                <button onClick={() => setCount(count + 1)}>加</button>
            </div>
        </main>
    );
}

export default Content

