import React, { useState } from 'react';
import { ArrowRight, Trash2, Check, Circle } from 'lucide-react';
import useTodos from '../hooks/useTodos';

const Todos = () => {
    const { todos, loading, addTodo: addTodoDb, toggleTodo: toggleTodoDb, deleteTodo: deleteTodoDb } = useTodos();
    const [inputValue, setInputValue] = useState('');

    const addTodo = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        await addTodoDb(inputValue);
        setInputValue('');
    };

    const toggleTodo = async (id) => {
        await toggleTodoDb(id);
    };

    const deleteTodo = async (id) => {
        await deleteTodoDb(id);
    };

    return (
        <div className="page-container">
            <header style={{ marginBottom: '24px' }}>
                <h1>Tasks</h1>
                <p style={{ opacity: 0.7 }}>{todos.filter(t => !t.completed).length} remaining</p>
            </header>

            <form onSubmit={addTodo} style={{ marginBottom: '24px', position: 'relative' }}>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Add a new task..."
                    className="glass-panel"
                    style={{
                        width: '100%',
                        padding: '16px 16px 16px 20px',
                        border: 'none',
                        outline: 'none',
                        fontSize: '16px',
                        color: 'var(--text-primary)',
                        borderRadius: 'var(--radius-lg)',
                    }}
                />
                <button
                    type="submit"
                    style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'var(--text-primary)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'var(--transition-fast)',
                    }}
                >
                    <ArrowRight size={20} />
                </button>
            </form>

            <div className="todo-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {todos.map(todo => (
                    <div
                        key={todo.id}
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
                                color: todo.completed ? 'var(--accent-color)' : 'var(--text-secondary)',
                                padding: 0,
                                display: 'flex',
                            }}
                        >
                            {todo.completed ? <Check size={24} /> : <Circle size={24} />}
                        </button>

                        <span
                            style={{
                                flex: 1,
                                textDecoration: todo.completed ? 'line-through' : 'none',
                                fontSize: '16px',
                            }}
                        >
                            {todo.text}
                        </span>

                        <button
                            onClick={() => deleteTodo(todo.id)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                padding: '8px',
                                opacity: 0.5,
                            }}
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}

                {todos.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                        <p>No tasks yet. Add one above!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Todos;
