import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("HERITCRAFT Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--black)] flex items-center justify-center px-6">
          <div className="panel max-w-xl text-center animate-fadeIn">
            <div className="text-7xl mb-6">⚠️</div>

            <h1 className="section-title mb-4">
              Something went wrong
            </h1>

            <p className="section-subtitle mb-8">
              HERITCRAFT faced an unexpected issue. Please refresh the page.
            </p>

            <button
              onClick={() => window.location.reload()}
              className="btn-gold text-xl"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;