"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error.message, errorInfo.componentStack);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="bg-[#0f172a] border border-slate-700 rounded-xl p-8 max-w-md w-full text-center space-y-4">
            <div className="w-14 h-14 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7 text-red-400" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">Something went wrong</h2>
              <p className="text-sm text-slate-400">An unexpected error occurred. Please try refreshing.</p>
              {this.state.error && (
                <details className="text-xs text-slate-500 mt-2">
                  <summary className="cursor-pointer hover:text-slate-300">Error details</summary>
                  <pre className="mt-2 text-left bg-slate-900 rounded-lg p-3 overflow-auto text-[11px] text-slate-400">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
            </div>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-5 py-2.5 rounded-lg text-xs mx-auto cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
