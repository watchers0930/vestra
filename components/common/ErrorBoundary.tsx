"use client";

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-6 text-center">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-900">
            문제가 발생했습니다
          </h2>
          <p className="text-sm text-gray-500 max-w-md">
            예상치 못한 오류가 발생했습니다. 아래 버튼을 눌러 다시 시도해 주세요.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
          >
            다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
