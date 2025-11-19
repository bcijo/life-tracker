import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Todos from './pages/Todos'
import Habits from './pages/Habits'
import Shopping from './pages/Shopping'
import Expenses from './pages/Expenses'

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="todos" element={<Todos />} />
                    <Route path="habits" element={<Habits />} />
                    <Route path="shopping" element={<Shopping />} />
                    <Route path="expenses" element={<Expenses />} />
                </Route>
            </Routes>
        </Router>
    )
}

export default App
