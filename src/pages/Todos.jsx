import React, { useState } from 'react';
import { ArrowRight, Trash2, Check, Circle, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import useTodos from '../hooks/useTodos';
import { format, isToday, isPast, isFuture, parseISO } from 'date-fns';

const Todos = () => {
    const { todos, loading, addTodo: addTodoDb, toggleTodo: toggleTodoDb, deleteTodo: deleteTodoDb } = useTodos();
    const [inputValue, setInputValue] = useState('');
    const [deadline, setDeadline] = useState('');
    const [showCompleted, setShowCompleted] = useState(false);

    const addTodo = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        await addTodoDb(inputValue, deadline || null);
        setInputValue('');
        setDeadline('');
    };

    const toggleTodo = async (id) => {
        await toggleTodoDb(id);
    };

    const deleteTodo = async (id) => {
        await deleteTodoDb(id);
    };

    // Sorting and Filtering Logic
    const activeTodos = todos.filter(t => !t.completed);
    const completedTodos = todos.filter(t => t.completed).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const todayTodos = activeTodos.filter(t => {
        if (!t.deadline) return false;
        const date = parseISO(t.deadline);
        // Include tasks due today or overdue
        return isToday(date) || (isPast(date) && !isToday(date));
    });

    const otherTodos = activeTodos.filter(t => {
        // Tasks with no deadline or future deadline
        if (!t.deadline) return true;
        const date = parseISO(t.deadline);
        return isFuture(date) && !isToday(date);
    }).sort((a, b) => {
        // Sort by deadline (earliest first), then created (newest first)
        if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return new Date(b.created_at) - new Date(a.created_at);
    });

    const TodoItem = ({ todo }) => (
        <div
            className="glass-card"
            style={{
                display: 'flex',
                alignItems: 'center',
                padding: '16px',
                gap: '12px',
                opacity: todo.completed ? 0.6 : 1,
                transition: 'all 0.3s ease',
            }}
        >
            <button
                onClick={() => toggleTodo(todo.id)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: todo.completed ? '#48bb78' : 'var(--text-secondary)',
                    padding: 0,
                    display: 'flex',
                    cursor: 'pointer'
                }}
            >
                {todo.completed ? <Check size={24} /> : <Circle size={24} />}
            </button>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span
                    style={{
                        textDecoration: todo.completed ? 'line-through' : 'none',
                        fontSize: '16px',
                        color: todo.completed ? 'var(--text-secondary)' : 'var(--text-primary)',
                    }}
                >
                    {todo.text}
                </span>
                {todo.deadline && (
                    <span style={{ fontSize: '12px', color: isPast(parseISO(todo.deadline)) && !isToday(parseISO(todo.deadline)) && !todo.completed ? '#f56565' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} />
                        {isToday(parseISO(todo.deadline)) ? 'Today' : format(parseISO(todo.deadline), 'MMM d, yyyy')}
                    </span>
                )}
            </div>

            <button
                onClick={() => deleteTodo(todo.id)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    padding: '8px',
                    opacity: 0.5,
                    cursor: 'pointer'
                }}
            >
                <Trash2 size={18} />
            </button>
        </div>
    );

    return (
        <div className="page-container" style={{ paddingBottom: '80px' }}>
            <header style={{ marginBottom: '24px' }}>
                <h1>Tasks</h1>
                <p style={{ opacity: 0.7 }}>{activeTodos.length} remaining</p>
            </header>

            <form onSubmit={addTodo} style={{ marginBottom: '32px' }}>
                <div className="glass-panel" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Add a new task..."
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: 'none',
                            outline: 'none',
                            fontSize: '16px',
                            background: 'transparent',
                            color: 'var(--text-primary)',
                        }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px 8px' }}>
                        <input
                            type="date"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            style={{
                                border: 'none',
                                background: 'rgba(0,0,0,0.05)',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontFamily: 'inherit'
                            }}
                        />
                        <button
                            type="submit"
                            style={{
                                background: 'var(--text-primary)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '50%',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                            }}
                        >
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* TODAY Section */}
                {todayTodos.length > 0 && (
                    <section>
                        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#f56565', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Due Today & Overdue
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {todayTodos.map(todo => <TodoItem key={todo.id} todo={todo} />)}
                        </div>
                    </section>
                )}

                {/* UPCOMING / OTHER Section */}
                <section>
                    {/* Only show header if Today section exists to separate them */}
                    {todayTodos.length > 0 && <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Upcoming</h3>}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {otherTodos.map(todo => <TodoItem key={todo.id} todo={todo} />)}
                    </div>
                    {activeTodos.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                            <p>No active tasks. You're all caught up!</p>
                        </div>
                    )}
                </section>

                {/* COMPLETED Section */}
                {completedTodos.length > 0 && (
                    <section style={{ marginTop: '12px' }}>
                        <button
                            onClick={() => setShowCompleted(!showCompleted)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                padding: '8px 0',
                                width: '100%'
                            }}
                        >
                            {showCompleted ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            Completed ({completedTodos.length})
                        </button>

                        {showCompleted && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px', animation: 'fadeIn 0.2s ease' }}>
                                {completedTodos.map(todo => <TodoItem key={todo.id} todo={todo} />)}
                            </div>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
};

export default Todos;
