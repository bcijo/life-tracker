import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import MigrationBanner from './components/MigrationBanner'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Todos from './pages/Todos'
import Habits from './pages/Habits'
import Shopping from './pages/Shopping'
import Expenses from './pages/Expenses'
import BankAccounts from './pages/BankAccounts'

function App() {
    return (
        <AuthProvider>
            <MigrationBanner />
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/" element={
                        <ProtectedRoute>
                            <Layout />
                        </ProtectedRoute>
                    }>
                        <Route index element={<Dashboard />} />
                        <Route path="todos" element={<Todos />} />
                        <Route path="habits" element={<Habits />} />
                        <Route path="shopping" element={<Shopping />} />
                        <Route path="expenses" element={<Expenses />} />
                        <Route path="bank-accounts" element={<BankAccounts />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </AuthProvider>
    )
}

export default App
