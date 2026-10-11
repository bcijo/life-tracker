import React, { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider } from './contexts/AuthContext'
import { EncryptionProvider } from './contexts/EncryptionContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { UpdateProvider } from './contexts/UpdateContext'
import ForceUpdateModal from './components/common/ForceUpdateModal'
import ErrorBoundary from './components/common/ErrorBoundary'
import AppLoader from './components/common/AppLoader'
import Layout from './components/Layout'
import MigrationBanner from './components/MigrationBanner'
import ProtectedRoute from './components/ProtectedRoute'

// Pages are code-split so each one is only downloaded when first visited
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Todos = lazy(() => import('./pages/Todos'))
const Habits = lazy(() => import('./pages/Habits'))
const Finances = lazy(() => import('./pages/Finances'))
const BillSplitter = lazy(() => import('./pages/BillSplitter'))
const Friends = lazy(() => import('./pages/Friends'))
const InviteLanding = lazy(() => import('./pages/InviteLanding'))
const Assistant = lazy(() => import('./pages/Assistant'))
const Journal = lazy(() => import('./pages/Journal'))
const Feedback = lazy(() => import('./pages/Feedback'))
const UserGuide = lazy(() => import('./pages/UserGuide'))

function App() {
    return (
        <ErrorBoundary>
            <ThemeProvider>
                <UpdateProvider>
                    <ForceUpdateModal />
                    <AuthProvider>
                        <EncryptionProvider>
                            <MigrationBanner />
                            <Router>
                        <Suspense fallback={<AppLoader variant="fullscreen" size="large" />}>
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route path="/signup" element={<Signup />} />
                            <Route path="/invite/:username" element={
                                <ProtectedRoute>
                                    <InviteLanding />
                                </ProtectedRoute>
                            } />
                            <Route path="/" element={
                                <ProtectedRoute>
                                    <Layout />
                                </ProtectedRoute>
                            }>
                                <Route index element={<Dashboard />} />
                                <Route path="assistant" element={<Assistant />} />
                                <Route path="ai" element={<Navigate to="/assistant" replace />} />
                                <Route path="habits" element={<Habits />} />
                                <Route path="finances/*" element={<Finances />} />
                                <Route path="friends" element={<Friends />} />
                                <Route path="todos" element={<Todos />} />
                                <Route path="split-bill" element={<BillSplitter />} />
                                <Route path="journal" element={<Journal />} />
                                <Route path="feedback" element={<Feedback />} />
                                <Route path="guide" element={<UserGuide />} />
                                <Route path="user-guide" element={<Navigate to="/guide" replace />} />
                                <Route path="shopping" element={<Navigate to="/finances/shopping" replace />} />
                                <Route path="expenses" element={<Navigate to="/finances" replace />} />
                                <Route path="bank-accounts" element={<Navigate to="/finances" replace />} />
                            </Route>
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                        </Suspense>
                    </Router>
                    <Analytics />
                    </EncryptionProvider>
                </AuthProvider>
                </UpdateProvider>
            </ThemeProvider>
        </ErrorBoundary>
    )
}

export default App
