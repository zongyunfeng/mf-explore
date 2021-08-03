import { useState, useEffect } from 'react'

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
        element.async = true

        setReady(false)
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

export default useScript
