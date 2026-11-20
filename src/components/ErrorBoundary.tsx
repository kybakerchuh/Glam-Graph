import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'An unexpected application error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF8F6] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-xl border border-[#E7E1DA] bg-white p-6 space-y-4">
            <h1 className="font-display text-xl font-semibold text-[#1C1917]">
              Studio Sync Interrupted
            </h1>
            <p className="text-sm text-[#57534E] leading-relaxed">
              Something interrupted your session. You can reload the studio safely to continue.
            </p>
            <div className="rounded-lg bg-[#FAF8F6] border border-[#E7E1DA] p-3 text-xs font-mono text-[#44403C] break-words max-h-32 overflow-y-auto">
              {this.state.message}
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-[#9D174D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#831843] transition-colors cursor-pointer"
            >
              Reload Studio
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
