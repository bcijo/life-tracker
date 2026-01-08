import React, { useState } from 'react';
import { Plus, Building2, Wallet, CreditCard, X, RefreshCw, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import Modal from './Modal';
import CurrencyInput from './CurrencyInput';

const ACCOUNT_TYPES = [
    { id: 'savings', label: 'Savings Account', icon: Building2, color: '#48bb78' },
    { id: 'credit', label: 'Credit Card', icon: CreditCard, color: '#f56565' },
    { id: 'wallet', label: 'Digital Wallet', icon: Wallet, color: '#4ecdc4' },
];

const BankAccountsSection = ({
    bankAccounts,
    onAddAccount,
    onUpdateBalance,
    onDeleteAccount,
    todayExpenses,
    isCollapsed,
    onToggleCollapse,
}) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(null);
    const [newAccount, setNewAccount] = useState({ name: '', type: 'savings', balance: '' });
    const [updateBalance, setUpdateBalance] = useState('');

    const totalBalance = bankAccounts.reduce((acc, account) => {
        return acc + parseFloat(account.current_balance || 0);
    }, 0);

    const handleAddAccount = () => {
        if (!newAccount.name || !newAccount.balance) return;
        onAddAccount(newAccount.name, newAccount.type, newAccount.balance);
        setNewAccount({ name: '', type: 'savings', balance: '' });
        setShowAddForm(false);
    };

    const handleUpdateBalance = () => {
        if (!updateBalance || !showUpdateModal) return;
        onUpdateBalance(showUpdateModal, updateBalance);
        setUpdateBalance('');
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

    // Find the account name for the update modal
    const accountToUpdate = bankAccounts.find(a => a.id === showUpdateModal);

    return (
        <div
            className="glass-card"
            style={{
                padding: '16px',
                marginBottom: '20px',
                background: 'linear-gradient(135deg, rgba(72, 187, 120, 0.1) 0%, rgba(72, 187, 120, 0.02) 100%)',
                borderLeft: '4px solid #48bb78',
            }}
        >
            {/* Header */}
            <div
                onClick={onToggleCollapse}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    marginBottom: isCollapsed ? 0 : '16px',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>🏦</span>
                    <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Bank Accounts</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '18px', fontWeight: '700', color: '#48bb78' }}>
                        ₹{totalBalance.toFixed(0)}
                    </span>
                    {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                </div>
            </div>

            {!isCollapsed && (
                <>
                    {/* Account List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                        {bankAccounts.map(account => (
                            <div
                                key={account.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px',
                                    background: 'rgba(255,255,255,0.6)',
                                    borderRadius: 'var(--radius-sm)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        background: getAccountColor(account.account_type),
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                    }}>
                                        {getAccountIcon(account.account_type)}
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: '500', fontSize: '14px' }}>{account.name}</p>
                                        <p style={{ fontSize: '11px', opacity: 0.6 }}>
                                            {ACCOUNT_TYPES.find(t => t.id === account.account_type)?.label}
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{
                                        fontWeight: '600',
                                        fontSize: '15px',
                                        color: parseFloat(account.current_balance) >= 0 ? '#48bb78' : '#f56565',
                                    }}>
                                        ₹{parseFloat(account.current_balance).toFixed(0)}
                                    </span>
                                    <button
                                        onClick={() => {
                                            setShowUpdateModal(account.id);
                                            setUpdateBalance(account.current_balance?.toString() || '');
                                        }}
                                        style={{
                                            background: 'rgba(0,0,0,0.05)',
                                            border: 'none',
                                            borderRadius: '6px',
                                            padding: '6px',
                                            cursor: 'pointer',
                                            color: 'var(--text-secondary)',
                                        }}
                                        title="Update Balance"
                                    >
                                        <RefreshCw size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {bankAccounts.length === 0 && (
                            <p style={{ textAlign: 'center', opacity: 0.5, padding: '16px', fontSize: '13px' }}>
                                No bank accounts added yet
                            </p>
                        )}
                    </div>

                    {/* Add Account Button */}
                    <button
                        onClick={() => setShowAddForm(true)}
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: 'rgba(72, 187, 120, 0.15)',
                            border: '1px dashed rgba(72, 187, 120, 0.4)',
                            borderRadius: 'var(--radius-sm)',
                            color: '#48bb78',
                            fontWeight: '500',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                        }}
                    >
                        <Plus size={16} />
                        Add Bank Account
                    </button>
                </>
            )}

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
                        We'll track the difference.
                    </p>

                    <CurrencyInput
                        value={updateBalance}
                        onChange={(val) => setUpdateBalance(val)}
                        placeholder="Current Balance"
                        autoFocus={true}
                        inputStyle={{
                            fontSize: '16px',
                        }}
                    />

                    <button
                        onClick={handleUpdateBalance}
                        disabled={!updateBalance}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: updateBalance ? '#48bb78' : 'rgba(0,0,0,0.1)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: '600',
                            cursor: updateBalance ? 'pointer' : 'not-allowed',
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

export default BankAccountsSection;
