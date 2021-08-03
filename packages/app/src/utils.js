const loadComponent = (scope, module) => {
    return () =>
        window[scope].get(module).then((factory) => {
            return factory()
        })
}

export { loadComponent }
