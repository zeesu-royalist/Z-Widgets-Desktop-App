import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { WidgetHost } from './WidgetHost'
import './index.css'

const isWidgetRoute = window.location.hash.startsWith('#/widget')

if (isWidgetRoute) {
  document.documentElement.classList.add('widget-window')
  document.body.classList.add('widget-window')
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {isWidgetRoute ? <WidgetHost /> : <App />}
  </React.StrictMode>
)
