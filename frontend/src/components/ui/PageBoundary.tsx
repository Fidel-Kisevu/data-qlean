// src/components/PageBoundary.tsx
import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class PageBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-2xl border border-[#5b3a3a] bg-[#3a2f2f] p-6 text-sm text-[#f3c8c8]">
          <p className="font-semibold">This page hit an error.</p>
          <p className="mt-1 text-[#e5b1b1]">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-4 rounded-xl bg-[#5c3b3b] px-3.5 py-2 text-xs font-medium text-white"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}