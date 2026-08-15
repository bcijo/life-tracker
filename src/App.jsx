import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'
import MigrationBanner from './components/MigrationBanner'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Todos from './pages/Todos'
import Habits from './pages/Habits'
import Finances from './pages/Finances'
import BillSplitter from './pages/BillSplitter'
import Friends from './pages/Friends'
import InviteLanding from './pages/InviteLanding'
import Assistant from './pages/Assistant'
import Journal from './pages/Journal'

function App() {
    return (
        <ThemeProvider>
        <AuthProvider>
            <MigrationBanner />
            <Router>
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
                        <Route path="shopping" element={<Navigate to="/finances/shopping" replace />} />
                        <Route path="expenses" element={<Navigate to="/finances/spend" replace />} />
                        <Route path="bank-accounts" element={<Navigate to="/finances/accounts" replace />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
            <Analytics />
        </AuthProvider>
        </ThemeProvider>
    )
}

export default App
