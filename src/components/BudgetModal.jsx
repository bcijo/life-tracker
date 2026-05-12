import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import CurrencyInput from './CurrencyInput';
import { Target, Link as LinkIcon } from 'lucide-react';
import useExpenseCards from '../hooks/useExpenseCards';
import useBankAccounts from '../hooks/useBankAccounts';

const BudgetModal = ({ isOpen, onClose, onSave, budgetToEdit = null }) => {
    const { cards: categories } = useExpenseCards();
    const { accounts } = useBankAccounts();

    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState('');

    useEffect(() => {
        if (budgetToEdit) {
            setName(budgetToEdit.name);
            setAmount(budgetToEdit.amount.toString());
            setSelectedCategories(budgetToEdit.category_ids || []);
            setSelectedAccount(budgetToEdit.account_id || '');
        } else {
            setName('');
            setAmount('');
            setSelectedCategories([]);
            setSelectedAccount('');
        }
    }, [budgetToEdit, isOpen]);

    const handleSave = () => {
        if (!name || !amount) return;
        onSave(name, amount, selectedCategories, selectedAccount || null);
        onClose();
    };

    const toggleCategory = (id) => {
        if (selectedCategories.includes(id)) {
            setSelectedCategories(selectedCategories.filter(c => c !== id));
        } else {
            setSelectedCategories([...selectedCategories, id]);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={budgetToEdit ? "Edit Budget" : "New Budget"}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '75vh', overflowY: 'auto', paddingRight: '4px' }}>
                <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>BUDGET NAME</label>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Vacation, Monthly Groceries"
                        style={{
                            width: '100%', padding: '14px', border: '1px solid var(--glass-card-border)',
                            borderRadius: '12px', background: 'var(--surface-input)', color: 'var(--text-primary)', fontSize: '15px',
                        }}
                    />
                </div>

                <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>BUDGET LIMIT</label>
                    <CurrencyInput
                        value={amount}
                        onChange={setAmount}
                        placeholder="Amount"
                        inputStyle={{ fontSize: '24px', padding: '12px', fontWeight: 'bold', borderBottom: '2px solid var(--border-subtle)' }}
                    />
                </div>

                <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <LinkIcon size={14} /> LINKED CATEGORIES (Optional)
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {(categories || []).map(cat => {
                            const isSelected = selectedCategories.includes(cat.id);
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => toggleCategory(cat.id)}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '20px',
                                        border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--glass-card-border)'}`,
                                        background: isSelected ? 'var(--accent-primary)22' : 'var(--glass-card-bg)',
                                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {cat.name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <LinkIcon size={14} /> LINKED BANK ACCOUNT (Optional)
                    </label>
                    <select
                        value={selectedAccount}
                        onChange={e => setSelectedAccount(e.target.value)}
                        style={{
                            width: '100%', padding: '14px', border: '1px solid var(--glass-card-border)',
                            borderRadius: '12px', background: 'var(--surface-input)', color: 'var(--text-primary)', fontSize: '15px',
                        }}
                    >
                        <option value="">No specific account</option>
                        {(accounts || []).map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={handleSave}
                    disabled={!name || !amount}
                    style={{
                        width: '100%', padding: '16px', background: (name && amount) ? 'var(--text-primary)' : 'var(--border-subtle)',
                        color: 'var(--bg-primary)', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '16px',
                        cursor: (name && amount) ? 'pointer' : 'not-allowed', marginTop: '12px',
                        transition: 'all 0.2s ease'
                    }}
                >
                    Save Budget
                </button>
            </div>
        </Modal>
    );
};

export default BudgetModal;
