import React, { Component, ErrorInfo, ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { WidgetHost } from './widgets/WidgetHost'
import './index.css'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[REACT_RENDER_CRASH]', error, errorInfo)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-[#121316] text-white p-6 font-sans select-text">
          <div className="max-w-md w-full bg-[#1e2025] border border-white/10 rounded-2xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 text-xl font-bold">
              !
            </div>
            <h1 className="text-lg font-semibold text-white mb-2">Z-Widgets Notice</h1>
            <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
              The application encountered a problem during display. You can reload or restart Z-Widgets.
            </p>
            <div className="p-3 bg-black/40 rounded-lg text-left mb-5 overflow-auto max-h-32 text-[11px] font-mono text-rose-300">
              {this.state.error?.message || 'Unknown runtime error'}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 bg-white hover:bg-neutral-200 text-neutral-900 rounded-xl font-medium text-xs transition-all cursor-pointer shadow"
            >
              Reload Z-Widgets
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

window.addEventListener('error', (event) => {
  console.error('[UNCAUGHT_WINDOW_ERROR]', event.error || event.message)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('[UNHANDLED_PROMISE_REJECTION]', event.reason)
})

const isWidgetRoute = window.location.hash.startsWith('#/widget')

if (isWidgetRoute) {
  document.documentElement.classList.add('widget-window')
  document.body.classList.add('widget-window')
}

const rootElement = document.getElementById('root')
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <RootErrorBoundary>
        {isWidgetRoute ? <WidgetHost /> : <App />}
      </RootErrorBoundary>
    </React.StrictMode>
  )
}
