'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // You can log the error to an error reporting service here
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
          <div className="flex items-center mb-4">
            <AlertCircle className="h-6 w-6 mr-2" />
            <h3 className="text-lg font-medium">Something went wrong</h3>
          </div>
          <p className="mb-4">An error occurred while rendering this component.</p>
          <details className="bg-red-100 p-2 rounded text-sm mb-4">
            <summary>Error details</summary>
            <p className="mt-2 font-mono">{this.state.error?.toString()}</p>
          </details>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-red-100 hover:bg-red-200 transition-colors rounded-md"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}