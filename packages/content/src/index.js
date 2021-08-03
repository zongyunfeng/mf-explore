import ReactDOM from "react-dom";
import React from "react";
import Content from "content/Content";
import {RecoilRoot} from "recoil";

const container = document.createElement("div");
document.body.appendChild(container);
ReactDOM.render(
    <RecoilRoot>
        <Content/>
    </RecoilRoot>
    , container);

