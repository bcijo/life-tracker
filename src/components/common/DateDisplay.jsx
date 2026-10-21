import React from 'react';
import { Calendar } from 'lucide-react';

/**
 * DateDisplay - Consistent Day and Date header component
 * Displays day of the week, month, and date formatted like "Wednesday, October 21"
 * with an accompanying Calendar icon.
 */
const DateDisplay = ({ date, style = {}, iconSize = 14, className = '' }) => {
    const targetDate = date ? (typeof date === 'string' ? new Date(date) : date) : new Date();
    const dateFormatted = targetDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });

    return (
        <p
            className={className}
            style={{
                fontSize: '13px',
                color: 'var(--text-muted)',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                ...style,
            }}
        >
            <Calendar size={iconSize} />
            <span>{dateFormatted}</span>
        </p>
    );
};

export default DateDisplay;
