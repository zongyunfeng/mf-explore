## 前言

前几天我们稍微尝试了一下`Webpack`提供的新能力`Module Federation`，它为我们代码共享跟团队协作提供了新的可能性。之前若是我们项目A跟项目B有一些共同的逻辑，那我们可能会选择把它抽成一个npm包，然后在两个项目间引入。但是这有个缺点是只要npm包更新，我们的项目就需要重新打包来引入公共逻辑的更新，哪怕项目里一行代码没改。

而通过`ModuleFederation`，我们指定`exposes`跟`shared`，就可以配置要导出的模块跟它依赖的一些库，就可以成功地把这个模块分享出去。通过配置`remotes`，就可以指定一些依赖的远程模块。我们的应用会在运行时去请求依赖的远程模块，不需要重新打包（前提是远程模块没有`breaking change`）。这个时候项目A就可以在它的项目里实现这部分逻辑然后把这部分逻辑分享出去，项目B再引入，两个项目各自独立部署运行同时又在公共逻辑这边保持相同的行为。

这带来的好处绝不只是减少体力劳动这么简单，今天我们就来进一步探讨一下其它方向的可能性。

## 开始吧～

先创建多个项目：
1. app：主项目，依赖了从其他项目暴露出来的远程模块，运行在8000端口
2. header：提供了一个Header组件，展示一些视图，运行在8001端口
3. content：提供了一个Content组件，展示一些视图，运行在8002端口
4. footer：提供了一个Footer组件，展示一些视图，运行在8003端口

我们先实现一些组件，先在我们的`header`项目里实现`Header`组件：
```
const Header = ({count,reset}) => {
  return (
        <header>
            <h1>计数器Header</h1>
            <span>{`当前数量是：${count}`}</span>
            <button onClick={reset}>重置</button>
        </header>
    )
}
```

它接受一个属性`count`来展示当前数量以及提供了一个按钮来重置数字。

然后把这个`Header`导出：

```
const commonConfig = merge([
    parts.basis({mode}),
    parts.loadJavaScript(),
    parts.page({title: 'Header'}),
    parts.federateModule({
        name: 'header',
        filename: 'headerComp.js',
        remotes: {
            header: 'header@http://127.0.0.1:8001/headerComp.js',
        },
        shared: sharedDependencies,
        exposes: {'./Header': './src/Header'},
    }),
])
```

我用函数封装的方式，将`Webpack`各个单一功能的配置对象管理起来（基础配置、页面配置、js配置、ModuleFederation配置等等），最后把各个不同功能的函数返回的配置对象`merge`成`Webpack`熟悉的形式，感兴趣的可以看看之前这篇文章，现在我们直接拿来复用。

`content`项目里的的`Content`组件内容大体类似：
```
const Content = ({count,add}) => {
  return (
        <main>
            <span>计数器Content</span>
            <div>
                <span>{count}</span>
                <button onClick={add}>加</button>
            </div>
        </main>
    );
}
```

它接受一个属性`count`来展示数字以及提供了一个按钮来增加数字。

`footer`项目里的`Footer`组件展示固定的UI：
```
const Footer = () => {
    return <span>计数器Footer</span>
}
```

别忘了也要在`Webpack`配置中分别把这两个组件导出，我们app项目才能正常使用它们，具体操作跟`Header`类似，这边就不再赘述。

然后我们就可以在`app`里引入并使用他们啦！
```
const commonConfig = merge([
    parts.basis({mode}),
    parts.loadJavaScript(),
    parts.page({title: 'App'}),
    parts.federateModule({
        name: 'app',
        remotes: {
            header: 'header@http://127.0.0.1:8001/headerComp.js',
            content: 'content@http://127.0.0.1:8002/contentComp.js',
            footer: 'footer@http://127.0.0.1:8003/footerComp.js',
        },
        shared: sharedDependencies,
    }),
])
```

加载组件并渲染：

```
const Header = lazy(() => import('header/Header'))
const Content = lazy(() => import('content/Content'))
const Footer = lazy(() => import('footer/Footer'))

const App = () => {
    const [count, setCount] = useState(0)
    return (
        <div>
            <Suspense
                fallback={<FallbackContent text={'正在加载Header'}/>}
            >
                <Header count={count} reset={() => setCount(0)}/>
            </Suspense>

            <Suspense
                fallback={<FallbackContent text={'正在加载Content'}/>}
            >
                <Content count={count} add={() => setCount(count + 1)}/>
            </Suspense>

            <Suspense
                fallback={<FallbackContent text={'正在加载Footer'}/>}
            >
                <Footer/>
            </Suspense>
                
        </div>
    )
}
```

现在我们把各个项目都跑起来，


![运行项目控制台输出](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a23b20a0367b49d1ad6bed6ef92d373c~tplv-k3u1fbpfcp-watermark.image)

来看看效果：


![页面展示](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/372f850210b14124973d00b890737321~tplv-k3u1fbpfcp-watermark.image)

可以看到这些远程导入的组件，只用起来跟本地项目里的组件并没有什么区别，我们可以正常地传递数据给它们。

这边细心的同学可能已经注意到了，没错，`header`，`content`，`footer`这几个项目都是可以独立运行的，它们只是跟`app`共享了部分逻辑，不是要完全作为`app`的一部分。在这共享的逻辑之外，它们可以有所作为，自成一体。这种扩展性可以让多个团队快速迭代，独立测试，听起来是不是有点像亚马逊的那种`micro site`的开发方式？

## 那状态管理呢？

好多同学可能会疑惑了，这种非常规的开发方式，还涉及到“可以各自独立部署运行”，跟之前我们开发单页应用时有点不一样，那我们之前的那些状态管理方案还管用吗？

我和你们一样疑惑😉，实践出真知，我们来尝试引入`recoil`来做状态管理看看。

添加`recoil`的依赖，然后在`app`下新建一个`atoms.js`：
```
export const counter = atom({
    key: 'counter',
    default: 0,
})
```

然后把`RecoilRoot`作为我们`App组件`的根目录，之后把`atoms.js`导出：
```
parts.federateModule({
    name: 'app',
    filename: 'state.js',
    
    ...
    
    exposes: {
        './state': './src/atoms',
    },
}),
```

在`header`跟`content`项目里引入这个模块，这样做是没问题的，这几个项目既然没有固有的主次关系，都可以独立运行的，我能分享给你自然你也能分享给我，任何能以js模块导出的东西都可以通过`ModuleFederation`分享，这是仅能分享UI代码的微前端框架做不到的。（但是它们可以通过支持`ModuleFederation`来解决，手动滑稽下😆）

```
...
remotes: {
    ...
    state: "app@http://127.0.0.1:8000/state.js" },
    }
    ...
```

然后调整一下我们的组件，通过`hook`来使用这个`atom`：
```
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
```

```
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
```

`useRecoilState`几乎可以跟`useState`无缝切换，而且可以避免不必要的重复渲染，这点很棒~

接着重新把这几个项目跑起来，打开`http://127.0.0.1:8000/`，我们可以看到它表现得跟之前用属性注入的方式实现的效果一模一样，状态管理在这种开发模式下还是可以正常发挥作用的。这方面又跟我们的单页应用很像了。这边不是限制只有`recoil`才可以，经我实测`redux`，`mobx`都可以正常使用。

## Webpack为我们做了什么？

大家肯定都很好奇，`Webpack`究竟是怎样做到这一切的？我们既可以把每个部分都当成一个独立的应用来开发，类似于`micro site`，又可以把它们组合成一个完整的应用，类似于`spa`。这也太黑科技了吧！！

我们来仔细看看`Webpack`为我们做了什么，直接打开我们的`footer`项目，运行`yarn start`，可以看到如下输出：
```
[0] footer
[0]  | ⬡ webpack: assets by chunk 972 KiB (id hint: vendors)
[0]  |     asset vendors-node_modules_react-dom_index_js.js 909 KiB [emitted] (id hint: vendors)
[0]  |     asset vendors-node_modules_react_index_js.js 62.8 KiB [emitted] (id hint: vendors)
[0]  |   asset main.js 94.2 KiB [emitted] (name: main)
[0]  |   asset footerComp.js 61.1 KiB [emitted] (name: footer)
[0]  |   asset node_modules_object-assign_index_js-node_modules_prop-types_checkPropTypes_js.js 8.19 KiB [emitted]
[0]  |   asset src_index_js.js 2.14 KiB [emitted]
[0]  |   asset src_Footer_js.js 1.65 KiB [emitted]
[0]  |   asset index.html 229 bytes [emitted]

```


我们可以在`dist`目录找到这些文件。
* `main.js` 这里是这个应用的入口代码
* `index.html` 这个生成的HTMl文件引入了上面`main.js`
* `src_Footer_js.js` 这是我们`Footer`组件编译后产生的js文件
* `footerComp.js` 默认给的名字是`remoteEntry.js`，我们这边为了突出导出的是个`Footer`组件改成了`footerComp.js`，这是一个特殊的清单js文件，同时也包含我们通过`ModuleFederationPlugin`的`exposes`配置项导出去的模块以及运行时环境，
* `venders-node_modules_*.js `这些都是一些共享的依赖，也就是我们通过`ModuleFederationPlugin`的`shared`选项配置的依赖包

为了搞清楚整个加载流程，我们打开`app`的`main.js`，因为它作为宿主加载了很多远程模块，其中有段代码被注释为`remotes的加载过程`，我们一起来看看：

```
 /* webpack/runtime/remotes loading */
    /******/
    (() => {
        var chunkMapping = {
            /******/            "webpack_container_remote_header_Header": [
                /******/                "webpack/container/remote/header/Header"
                /******/],
            /******/            "webpack_container_remote_content_Content": [
                /******/                "webpack/container/remote/content/Content"
                /******/],
            /******/            "webpack_container_remote_footer_Footer": [
                /******/                "webpack/container/remote/footer/Footer"
                /******/]
            /******/
        };
        /******/
        var idToExternalAndNameMapping = {
            /******/            "webpack/container/remote/header/Header": [
                /******/                "default",
                /******/                "./Header",
                /******/                "webpack/container/reference/header"
                /******/],
            /******/            "webpack/container/remote/content/Content": [
                /******/                "default",
                /******/                "./Content",
                /******/                "webpack/container/reference/content"
                /******/],
            /******/            "webpack/container/remote/footer/Footer": [
                /******/                "default",
                /******/                "./Footer",
                /******/                "webpack/container/reference/footer"
                /******/]
            /******/
        };
        /******/
        __webpack_require__.f.remotes = (chunkId, promises) => {
            /******/
            if (__webpack_require__.o(chunkMapping, chunkId)) {
                /******/
                chunkMapping[chunkId].forEach((id) => {
                    /******/
                    var getScope = __webpack_require__.R;
                    /******/
                    if (!getScope) getScope = [];
                    /******/
                    var data = idToExternalAndNameMapping[id];
                    /******/
                    if (getScope.indexOf(data) >= 0) return;
                    /******/
                    getScope.push(data);
                    /******/
                    if (data.p) return promises.push(data.p);
                    /******/
                    var onError = (error) => {
                        /******/
                        if (!error) error = new Error("Container missing");
                        /******/
                        if (typeof error.message === "string")
                            /******/                            error.message += '\nwhile loading "' + data[1] + '" from ' + data[2];
                        /******/
                        __webpack_modules__[id] = () => {
                            /******/
                            throw error;
                            /******/
                        }
                        /******/
                        data.p = 0;
                        /******/
                    };
                    /******/
                    var handleFunction = (fn, arg1, arg2, d, next, first) => {
                        /******/
                        try {
                            /******/
                            var promise = fn(arg1, arg2);
                            /******/
                            if (promise && promise.then) {
                                /******/
                                var p = promise.then((result) => (next(result, d)), onError);
                                /******/
                                if (first) promises.push(data.p = p); else return p;
                                /******/
                            } else {
                                /******/
                                return next(promise, d, first);
                                /******/
                            }
                            /******/
                        } catch (error) {
                            /******/
                            onError(error);
                            /******/
                        }
                        /******/
                    }
                    /******/
                    var onExternal = (external, _, first) => (external ? handleFunction(__webpack_require__.I, data[0], 0, external, onInitialized, first) : onError());
                    /******/
                    var onInitialized = (_, external, first) => (handleFunction(external.get, data[1], getScope, 0, onFactory, first));
                    /******/
                    var onFactory = (factory) => {
                        /******/
                        data.p = 1;
                        /******/
                        __webpack_modules__[id] = (module) => {
                            /******/
                            module.exports = factory();
                            /******/
                        }
                        /******/
                    };
                    console.log(data[2], data[0], data[1])
                    /******/
                    handleFunction(__webpack_require__, data[2], 0, 0, onExternal, 1);
                    /******/
                });
                /******/
            }
            /******/
        }
        /******/
    })();
```

这段代码不是写给人看的，读起来真难受，不过我们只要照着这些变量看一下最后执行的那个`handleFunction`函数就好了，好歹寻到了一些蛛丝马迹。

第一次执行`handleFunction`传入了`data[2]`，那对于`footer`来说，就是传入了`webpack/container/reference/footer`，那我们去搜索一下这个字符串。

以`webpack/container/reference/footer`为key就这段代码了：

```
/***/ "webpack/container/reference/footer":
      /*!*************************************************************!*\ !*** external "footer@http://127.0.0.1:8003/footerComp.js" ***! \*************************************************************/
 /***/ ((module, __unused_webpack_exports, __webpack_require__) => {

          "use strict";
          var __webpack_error__ = new Error();
          module.exports = new Promise((resolve, reject) => {
              if (typeof footer !== "undefined") return resolve();
              __webpack_require__.l("http://127.0.0.1:8003/footerComp.js", (event) => {
                  if (typeof footer !== "undefined") return resolve();
                  var errorType = event && (event.type === 'load' ? 'missing' : event.type);
                  var realSrc = event && event.target && event.target.src;
                  __webpack_error__.message = 'Loading script failed.\n(' + errorType + ': ' + realSrc + ')';
                  __webpack_error__.name = 'ScriptExternalLoadError';
                  __webpack_error__.type = errorType;
                  __webpack_error__.request = realSrc;
                  reject(__webpack_error__);
              }, "footer");
          }).then(() => (footer));

          /***/
  })
```

这边去请求了`footerComp.js`了。我们来看一下`__webpack_require__.l`的定义：

```
 (() => {
        /******/
        var inProgress = {};
        /******/
        var dataWebpackPrefix = "app:";
        /******/ 		// loadScript function to load a script via script tag
        /******/
        __webpack_require__.l = (url, done, key, chunkId) => {
            /******/
            if (inProgress[url]) {
                inProgress[url].push(done);
                return;
            }
            /******/
            var script, needAttach;
            /******/
            if (key !== undefined) {
                /******/
                var scripts = document.getElementsByTagName("script");
                /******/
                for (var i = 0; i < scripts.length; i++) {
                    /******/
                    var s = scripts[i];
                    /******/
                    if (s.getAttribute("src") == url || s.getAttribute("data-webpack") == dataWebpackPrefix + key) {
                        script = s;
                        break;
                    }
                    /******/
                }
                /******/
            }
            /******/
            if (!script) {
                /******/
                needAttach = true;
                /******/
                script = document.createElement('script');
                /******/
                /******/
                script.charset = 'utf-8';
                /******/
                script.timeout = 120;
                /******/
                if (__webpack_require__.nc) {
                    /******/
                    script.setAttribute("nonce", __webpack_require__.nc);
                    /******/
                }
                /******/
                script.setAttribute("data-webpack", dataWebpackPrefix + key);
                /******/
                script.src = url;
                /******/
            }
            /******/
            inProgress[url] = [done];
            /******/
            var onScriptComplete = (prev, event) => {
                    /******/ 				// avoid mem leaks in IE.
                    /******/
                    script.onerror = script.onload = null;
                    /******/
                    clearTimeout(timeout);
                    /******/
                    var doneFns = inProgress[url];
                    /******/
                    delete inProgress[url];
                    /******/
                    script.parentNode && script.parentNode.removeChild(script);
                    /******/
                    doneFns && doneFns.forEach((fn) => (fn(event)));
                    /******/
                    if (prev) return prev(event);
                    /******/
                }
                /******/;
            /******/
            var timeout = setTimeout(onScriptComplete.bind(null, undefined, {type: 'timeout', target: script}), 120000);
            /******/
            script.onerror = onScriptComplete.bind(null, script.onerror);
            /******/
            script.onload = onScriptComplete.bind(null, script.onload);
            /******/
            needAttach && document.head.appendChild(script);
            /******/
        };
        /******/
    })();
```

它会创建一个`script`标签然后监听加载状态，那我们再去看`footerComp.js`。

在`footerComp.js`最开始定义了一个全局变量`footer`，然后它去请求一些被导出来的文件，即我们的`Footer`组件：

```
var footer;

...

var __webpack_modules__ = ({

      /***/ "webpack/container/entry/footer":
      /*!***********************!*\ !*** container entry ***! \***********************/
 /***/ ((__unused_webpack_module, exports, __webpack_require__) => {

          eval("var moduleMap = {\n\t\"./Footer\": () => {\n\t\t" +
              "return Promise.all([__webpack_require__.e(\"webpack_sharing_consume_default_react_react-_1a68\"), " +
              "__webpack_require__.e(\"src_Footer_js\")]).then(() => " +
              "(() => ((__webpack_require__(/*! ./src/Footer */ \"./src/Footer.js\")))));\n\t}\n};\n" +
              "var get = (module, getScope) => {\n\t" +
              "__webpack_require__.R = getScope;\n\t" +
              "getScope = (\n\t\t" +
              "__webpack_require__.o(moduleMap, module)\n\t\t\t" +
              "? moduleMap[module]()\n\t\t\t: Promise.resolve().then(() => {\n\t\t\t\t" +
              "throw new Error('Module \"' + module + '\" does not exist in container.');\n\t\t\t})\n\t);\n\t" +
              "__webpack_require__.R = undefined;\n\treturn getScope;\n};\n" +
              "var init = (shareScope, initScope) => {\n\tif (!__webpack_require__.S) return;\n\t" +
              "var oldScope = __webpack_require__.S[\"default\"];\n\t" +
              "var name = \"default\"\n\tif(oldScope && oldScope !== shareScope) " +
              "throw new Error(\"Container initialization failed as it has already been initialized with a different share scope\");\n\t" +
              "__webpack_require__.S[name] = shareScope;\n\t" +
              "return __webpack_require__.I(name, initScope);\n};\n\n// This exports getters to disallow modifications\n" +
              "__webpack_require__.d(exports, {\n\tget: () => (get),\n\tinit: () => (init)\n});\n\n//# sourceURL=webpack://footer/container_entry?");

          /***/
  })

      /******/
  });

...
```

然后在`footerComp.js`的最后：
```
...
var __webpack_exports__ = __webpack_require__("webpack/container/entry/footer");
/******/ 
footer = __webpack_exports__;
```

当回到`app`的`main.js`的时候，又会执行这两个方法：
```
 var onExternal = (external, _, first) => (external ? handleFunction(__webpack_require__.I, data[0], 0, external, onInitialized, first) : onError());
                    /******/
                    var onInitialized = (_, external, first) => (handleFunction(external.get, data[1], getScope, 0, onFactory, first));
```

这下大致的逻辑就有了，当`remoteEntry.js`被浏览器加载后，它会用我们在`ModuleFederationPlugin`里面指定的`name`注册一个全局变量。这个变量有一个`get`方法来返回`remote模块`以及一个`init`函数，这个函数用来管理所有共享的依赖的。

就拿我们上面的`footer`项目来说，当它的`footerComp.js`文件（注意没有设置`filename`时叫`remoteEntry.js`），被浏览器加载后，会创建一个名为`footer`（我们通过`name`选项指定的）的全局变量，我们可以用控制台来看看它的组成：
`window.footer`


![控制台执行结果](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7a85bd51c3224a06bfedda755ec81452~tplv-k3u1fbpfcp-watermark.image)

通过这个`get`函数，我们可以拿到暴露出来的`Footer`组件：
```
window.footer.get('./Footer')
```

这会返回一个`promise`，当resolve的时候会给我们一个`factory`，我们来尝试调用它：
```
window.footer.get('./Footer').then(factory=>console.log(factory()))
```

我们把这个模块打印到控制台上了。


![获取组件后的结果](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f6f0636740a24a0d8f7e91855d08fc6e~tplv-k3u1fbpfcp-watermark.image)

这边我们的`Footer`是默认导出，所以我们看到这个返回的`Module`对象有个`key`名为`default`，如果这个模块包含其他的命名导出，也会被添加到这个对象中。

需要注意的是，我们调用这个`factory`会去加载这个远程模块需要的共享依赖，`Webpack`在这方面做得还比较智能，像我们`header`，`content`模块都依赖了`recoil`，那这两个远程模块谁先被加载谁就去加载`recoil`，如果这个`recoil`版本满足剩下的那个的要求，剩下的那个远程模块就会直接使用这个已经加载好的`recoil`。而且循环引入跟嵌套的`remotes`都是支持的，比如我们这里，`app`暴露了`state`，`header`引入了`state`，`header`暴露了`Header`，`app`引入了`Header`，`Webpack`会正确处理这一流程。

## 骚操作一下？

那我们这个时候就恍然大悟了，原来，这边就跟`react hook`一样，通过全局变量来实现它的功能。一个可以随处访问的全局变量，我们只需要保证它先被加载进来就好了。

既然知道`Webpack`是怎么实现远程模块的加载的了，逻辑都很常规，那其实我们就可以手动模拟这一过程，不必把我们需要的远程模块都写在`Webpack`配置里。

首先是请求远程模块，把它添加在全局作用域内，我们先写一个`hook`来处理从`url`加载模块，这边需要的是我们清单文件也就是`remoteEntry.js`的地址：
```
const useScript = (args) => {
    const [ready, setReady] = useState(false)
    const [failed, setFailed] = useState(false)

    useEffect(() => {
        if (!args.url) {
            return
  }

        const element = document.createElement('script')

        element.src = args.url
  element.type = 'text/javascript'
  element.async = true    setReady(false)
        setFailed(false)

        element.onload = () => {
            console.log(`远程依赖已加载: ${args.url}`)
            setReady(true)
        }

        element.onerror = () => {
            console.error(`远程依赖加载失败: ${args.url}`)
            setReady(false)
            setFailed(true)
        }

        document.head.appendChild(element)

        return () => {
            console.log(`移除远程依赖: ${args.url}`)
            document.head.removeChild(element)
        }
    }, [args.url])

    return {
        ready,
        failed,
    }
}
```

这个是我们这个方案的灵魂，我们动态地添加一个`script`标签，然后监听加载的过程，通过useState的变量把导入远程依赖的状态动态地传递出去。

然后光把这样还不行，毕竟我们才引入了清单js文件，我们需要把背后真正的模块设置到到全局：

```
const loadComponent = (scope, module) => {
    return () =>
        window[scope].get(module).then((factory) => {
            return factory()
        })
}
```

最后我们需要在这些前置工作都完成的时候，把指定的内容加载出来：
```
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
```

这边因为我们知道远程那边导出的是一个React组件，所以直接实现了加载组件的逻辑，实际上还有很多其他类型的模块也可以分享，严谨一些这边要分情况处理。

然后精彩的地方来了：
```
<LoaderContainer
  module={'./Footer'}
    scope={'footer'}
    url={'http://127.0.0.1:8003/footerComp.js'}
/>
```

注意，由于我们`LoaderContainer`里面做了一些错误处理，在远程依赖被加载成功前会return别的UI元素，我们想要导入的远程模块的组件就不能使用`hook`了，否则会因为违反`hook`的规则报错。

现在我们重新运行一下项目，应该不会发现有什么变化。我们这边的例子虽然简单，看起来做了没必要做的事，但是这为我们提供了新世界的大门，因为我们不需要把我们项目依赖的远程模块写死在`Webpack`配置里了，也就是说，只要我们脑洞够大，模块配置可以以任何形式出现，我们甚至可以对用户做到“千人千面”，在运行时动态地拼装新的页面，而不需要借助各种flag，是不是很有意思呢？

## 总结
这么一通操作下来，我觉得`ModuleFederation`的可玩性还是很高的，我们可以看到它并不只是让我们少维护了几个代码仓库、少打了几次包这么简单，在各个体验上也同样出色。它既能给我们提供类似`micro site`一样的开发体验,又能带来`spa`提供的测试与使用体验，这是两者单独都很难做到的。未来可期，后面社区越来越多人拥抱它之后，一定还会开发出其它更有意思的使用方法。就目前来看，把基础依赖完全通过运行时动态请求可能不是很好的选择，比如基础组件库，在这种场景下我们可以同时构建npm包跟远程模块，然后优先使用远程模块，在远程模块无法使用时再转而使用应用打包时依赖的npm包作为备用方案（至于新的代码逻辑我们可以下次打包时再更新到它的最新npm版本），这样虽然可能没用上最新的代码，不过至少可以保证项目稳定运行。另外一些通用的代码，想要分享给更多人而不仅仅是内部业务使用的代码，比如`React`啊，`axios`啊，这种框架跟工具包等等，npm包还是最好的选择。

大家对`ModuleFederation`这种新事物怎么看呢，欢迎来跟我交流~

[完整代码地址](https://github.com/zongyunfeng/mf-explore)
