// components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logFrontendError, ErrorSeverity } from '../utils/errorLogger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // FIX: Reverted to using a constructor for state initialization. The class property syntax was causing `this.props` to be undefined in the render method, likely due to a build configuration issue. Explicitly calling `super(props)` in a constructor is the most reliable way to ensure the component's props are set up correctly.
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: undefined,
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    logFrontendError(error, ErrorSeverity.Critical, { componentStack: errorInfo.componentStack });
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 border border-red-500 bg-red-100 text-red-800 rounded-md">
          <h1 className="font-bold">Something went wrong.</h1>
          <p>We're sorry for the inconvenience. Our assistant Mia has been notified.</p>
          {this.state.error && <details className="whitespace-pre-wrap mt-2"><summary>Error Details</summary>{this.state.error.stack}</details>}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
