import useSupabaseData from './useSupabaseData';
import { supabase } from '../lib/supabase';
import { format, startOfDay } from 'date-fns';

function useBankAccounts() {
    const { data: bankAccounts, loading, error, insert, update, remove } = useSupabaseData('bank_accounts');
    const { data: snapshots, insert: insertSnapshot } = useSupabaseData('bank_balance_snapshots');

    const addBankAccount = async (name, accountType, initialBalance, color = '#4ecdc4', icon = '🏦') => {
        const newAccount = {
            name,
            account_type: accountType,
            current_balance: parseFloat(initialBalance) || 0,
            color,
            icon,
        };
        return await insert(newAccount);
    };

    const updateBalance = async (accountId, newBalance) => {
        const balance = parseFloat(newBalance);

        // Update the current balance
        await update(accountId, { current_balance: balance });

        // Create or update today's snapshot
        const today = format(startOfDay(new Date()), 'yyyy-MM-dd');

        try {
            // Try to upsert the snapshot
            const { error } = await supabase
                .from('bank_balance_snapshots')
                .upsert({
                    bank_account_id: accountId,
                    balance: balance,
                    snapshot_date: today,
                }, { onConflict: 'bank_account_id,snapshot_date' });

            if (error) throw error;
        } catch (err) {
            console.error('Error updating snapshot:', err);
        }
    };

    const deleteBankAccount = async (id) => {
        return await remove(id);
    };

    const getTotalBalance = () => {
        return bankAccounts.reduce((acc, account) => {
            // For credit cards, the balance is already negative/what you owe
            return acc + parseFloat(account.current_balance || 0);
        }, 0);
    };

    const getTodayNetChange = async () => {
        const today = format(startOfDay(new Date()), 'yyyy-MM-dd');
        const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');

        let todayTotal = 0;
        let yesterdayTotal = 0;

        for (const account of bankAccounts) {
            // Get today's snapshot
            const todaySnap = snapshots.find(s =>
                s.bank_account_id === account.id && s.snapshot_date === today
            );
            const yesterdaySnap = snapshots.find(s =>
                s.bank_account_id === account.id && s.snapshot_date === yesterday
            );

            todayTotal += todaySnap ? parseFloat(todaySnap.balance) : parseFloat(account.current_balance || 0);
            yesterdayTotal += yesterdaySnap ? parseFloat(yesterdaySnap.balance) : parseFloat(account.current_balance || 0);
        }

        return todayTotal - yesterdayTotal;
    };

    return {
        bankAccounts,
        loading,
        error,
        addBankAccount,
        updateBalance,
        deleteBankAccount,
        getTotalBalance,
        getTodayNetChange,
    };
}

export default useBankAccounts;
