import React, { useState } from 'react';
import { Plus, Building2, Wallet, CreditCard, RefreshCw, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import CurrencyInput from '../components/CurrencyInput';
import useBankAccounts from '../hooks/useBankAccounts';
import useTransactions from '../hooks/useTransactions';
import useExpenseCards from '../hooks/useExpenseCards';
import WeeklySummary from '../components/WeeklySummary';

const ACCOUNT_TYPES = [
    { id: 'savings', label: 'Savings Account', icon: Building2, color: '#48bb78' },
    { id: 'credit', label: 'Credit Card', icon: CreditCard, color: '#f56565' },
    { id: 'wallet', label: 'Digital Wallet', icon: Wallet, color: '#4ecdc4' },
];

// Format number with Indian numbering system (1,00,000 format)
const formatIndianNumber = (num) => {
    if (!num && num !== 0) return '0';
    const value = Math.round(parseFloat(num));
    const isNegative = value < 0;
    let intPart = Math.abs(value).toString();

    if (intPart.length > 3) {
        let lastThree = intPart.slice(-3);
        let remaining = intPart.slice(0, -3);
        remaining = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
        intPart = remaining + ',' + lastThree;
    }

    return isNegative ? '-' + intPart : intPart;
};

const BankAccounts = () => {
    const {
        bankAccounts,
        addBankAccount,
        updateBalance,
        deleteBankAccount,
        getTotalBalance
    } = useBankAccounts();

    const { transactions } = useTransactions();
    const { cards } = useExpenseCards();

    const [showAddForm, setShowAddForm] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(null);
    const [newAccount, setNewAccount] = useState({ name: '', type: 'savings', balance: '' });
    const [updateBalanceValue, setUpdateBalanceValue] = useState('');

    const handleAddAccount = async () => {
        if (!newAccount.name || !newAccount.balance) return;
        await addBankAccount(newAccount.name, newAccount.type, newAccount.balance);
        setNewAccount({ name: '', type: 'savings', balance: '' });
        setShowAddForm(false);
    };

    const handleUpdateBalance = async () => {
        if (!updateBalanceValue || !showUpdateModal) return;
        await updateBalance(showUpdateModal, updateBalanceValue);
        setUpdateBalanceValue('');
        setShowUpdateModal(null);
    };

    const getAccountIcon = (type) => {
        const accountType = ACCOUNT_TYPES.find(t => t.id === type);
        const Icon = accountType?.icon || Building2;
        return <Icon size={20} />;
    };

    const getAccountColor = (type) => {
        return ACCOUNT_TYPES.find(t => t.id === type)?.color || '#4ecdc4';
    };

    const accountToUpdate = bankAccounts.find(a => a.id === showUpdateModal);

    return (
        <div className="page-container">
            <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Money</h1>
                    <p style={{ fontSize: '14px', opacity: 0.7 }}>
                        Total Balance: <span style={{ fontWeight: '600', color: '#48bb78' }}>₹{formatIndianNumber(getTotalBalance())}</span>
                    </p>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    style={{
                        background: 'var(--text-primary)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Plus size={24} />
                </button>
            </header>

            {/* Weekly Summary */}
            <WeeklySummary transactions={transactions} categories={cards} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {bankAccounts.map(account => (
                    <div
                        key={account.id}
                        className="glass-card"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                background: getAccountColor(account.account_type),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                            }}>
                                {getAccountIcon(account.account_type)}
                            </div>
                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: '600' }}>{account.name}</h3>
                                <p style={{ fontSize: '12px', opacity: 0.6 }}>
                                    {ACCOUNT_TYPES.find(t => t.id === account.account_type)?.label}
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{
                                fontWeight: '700',
                                fontSize: '16px',
                                color: parseFloat(account.current_balance) >= 0 ? '#48bb78' : '#f56565',
                            }}>
                                ₹{formatIndianNumber(account.current_balance)}
                            </span>
                            <button
                                onClick={() => {
                                    setShowUpdateModal(account.id);
                                    setUpdateBalanceValue(account.current_balance?.toString() || '');
                                }}
                                style={{
                                    background: 'rgba(0,0,0,0.05)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '8px',
                                    cursor: 'pointer',
                                    color: 'var(--text-secondary)',
                                }}
                            >
                                <RefreshCw size={16} />
                            </button>
                            <button
                                onClick={() => {
                                    if (window.confirm('Are you sure you want to delete this account?')) {
                                        deleteBankAccount(account.id);
                                    }
                                }}
                                style={{
                                    background: 'rgba(255, 0, 0, 0.1)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '8px',
                                    cursor: 'pointer',
                                    color: '#f56565',
                                }}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}

                {bankAccounts.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                        <p>No accounts added yet.</p>
                    </div>
                )}
            </div>

            {/* Add Account Modal */}
            <Modal
                isOpen={showAddForm}
                onClose={() => setShowAddForm(false)}
                title="Add Bank Account"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <input
                        type="text"
                        placeholder="Account Name (e.g., HDFC Savings)"
                        value={newAccount.name}
                        onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(255,255,255,0.5)',
                            fontSize: '14px',
                        }}
                        autoFocus
                    />

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {ACCOUNT_TYPES.map(type => (
                            <button
                                key={type.id}
                                onClick={() => setNewAccount({ ...newAccount, type: type.id })}
                                style={{
                                    flex: 1,
                                    padding: '10px 8px',
                                    border: newAccount.type === type.id
                                        ? `2px solid ${type.color}`
                                        : '1px solid var(--glass-border)',
                                    borderRadius: 'var(--radius-sm)',
                                    background: newAccount.type === type.id
                                        ? `${type.color}15`
                                        : 'rgba(255,255,255,0.5)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '4px',
                                }}
                            >
                                <type.icon size={18} color={type.color} />
                                <span style={{ fontSize: '10px' }}>{type.label.split(' ')[0]}</span>
                            </button>
                        ))}
                    </div>

                    <CurrencyInput
                        value={newAccount.balance}
                        onChange={(val) => setNewAccount({ ...newAccount, balance: val })}
                        placeholder="Current Balance"
                        inputStyle={{
                            fontSize: '14px',
                        }}
                    />

                    <button
                        onClick={handleAddAccount}
                        disabled={!newAccount.name || !newAccount.balance}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: newAccount.name && newAccount.balance
                                ? '#48bb78'
                                : 'rgba(0,0,0,0.1)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: '600',
                            cursor: newAccount.name && newAccount.balance ? 'pointer' : 'not-allowed',
                            marginTop: '8px'
                        }}
                    >
                        Add Account
                    </button>
                </div>
            </Modal>

            {/* Update Balance Modal */}
            <Modal
                isOpen={!!showUpdateModal}
                onClose={() => setShowUpdateModal(null)}
                title="Update Balance"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ fontSize: '13px', opacity: 0.7 }}>
                        Update current balance for <strong>{accountToUpdate?.name}</strong>.
                    </p>

                    <CurrencyInput
                        value={updateBalanceValue}
                        onChange={(val) => setUpdateBalanceValue(val)}
                        placeholder="Current Balance"
                        autoFocus={true}
                        inputStyle={{
                            fontSize: '16px',
                        }}
                    />

                    <button
                        onClick={handleUpdateBalance}
                        disabled={!updateBalanceValue}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: updateBalanceValue ? '#48bb78' : 'rgba(0,0,0,0.1)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: '600',
                            cursor: updateBalanceValue ? 'pointer' : 'not-allowed',
                            marginTop: '8px'
                        }}
                    >
                        Update
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default BankAccounts;
