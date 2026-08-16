import React from 'react';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        if (this.props.onReset) {
            this.props.onReset();
        } else {
            window.location.reload();
        }
    };

    handleGoHome = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100dvh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    background: 'var(--bg-primary, #060b14)',
                    color: 'var(--text-primary, #f8fafc)',
                    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '440px',
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%), var(--surface-elevated, #0d111c)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        border: '1px solid var(--glass-border, rgba(255, 255, 255, 0.12))',
                        borderRadius: '24px',
                        padding: '32px 24px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.2)',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '16px'
                    }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '18px',
                            background: 'rgba(239, 68, 68, 0.12)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ef4444'
                        }}>
                            <AlertTriangle size={28} />
                        </div>

                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                                Something went wrong
                            </h2>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary, #94a3b8)', margin: 0, lineHeight: 1.5 }}>
                                An unexpected issue occurred while updating the screen. Your data is safe in the database.
                            </p>
                        </div>

                        {this.state.error?.message && (
                            <div style={{
                                width: '100%',
                                padding: '10px 12px',
                                background: 'rgba(0,0,0,0.3)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: '12px',
                                fontSize: '11px',
                                color: 'var(--text-muted, #64748b)',
                                textAlign: 'left',
                                fontFamily: 'monospace',
                                wordBreak: 'break-all',
                                maxHeight: '80px',
                                overflowY: 'auto'
                            }}>
                                {this.state.error.message}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '8px' }}>
                            <button
                                onClick={this.handleGoHome}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '12px',
                                    borderRadius: '14px',
                                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
                                    background: 'var(--surface-input, rgba(255,255,255,0.05))',
                                    color: 'var(--text-primary, #f8fafc)',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <Home size={16} />
                                <span>Go Home</span>
                            </button>

                            <button
                                onClick={this.handleReset}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '12px',
                                    borderRadius: '14px',
                                    border: 'none',
                                    background: 'var(--accent-gradient, linear-gradient(135deg, #a855f7 0%, #ec4899 100%))',
                                    color: '#ffffff',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 14px rgba(168, 85, 247, 0.35)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <RefreshCw size={16} />
                                <span>Reload App</span>
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
