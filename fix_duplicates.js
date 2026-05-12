import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pgckkonbsjvubgquzkuc.supabase.co';
const supabaseKey = 'sb_publishable_u2Yz4O0NHs9OBHjqgXMfTg_l4ftozgt';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDuplicates() {
    console.log('Fetching transactions...');
    const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .ilike('description', '%(Recurring)%');

    if (error) {
        console.error('Error fetching:', error);
        return;
    }

    // Group by description
    const groups = {};
    for (const tx of transactions) {
        const month = tx.date.substring(0, 7); // yyyy-mm
        const key = `${tx.description}_${month}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(tx);
    }

    let deletedCount = 0;
    for (const [key, group] of Object.entries(groups)) {
        if (group.length > 1) {
            console.log(`Found ${group.length} duplicates for ${key}`);
            // Sort by created_at or date to keep the first one
            group.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            // Delete all except the first one
            const toDelete = group.slice(1);
            for (const tx of toDelete) {
                console.log(`Deleting duplicate ID: ${tx.id}`);
                const { error: delError } = await supabase
                    .from('transactions')
                    .delete()
                    .eq('id', tx.id);
                if (delError) console.error('Error deleting:', delError);
                else deletedCount++;
            }
        }
    }
    console.log(`Finished fixing duplicates. Deleted: ${deletedCount}`);
}

fixDuplicates();
