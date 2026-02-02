import React, { useState, useEffect } from 'react';

/**
 * CurrencyInput - A formatted currency input component
 * Displays numbers with proper comma formatting (Indian style: 1,00,000)
 * Returns the raw numeric value via onChange
 */
const CurrencyInput = ({
    value,
    onChange,
    placeholder = 'Amount',
    style = {},
    className = '',
    currencySymbol = '₹',
    disabled = false,
    autoFocus = false,
    ...props
}) => {
    const [displayValue, setDisplayValue] = useState('');

    // Format number with Indian numbering system (1,00,000 format)
    const formatIndianNumber = (num) => {
        if (!num && num !== 0) return '';

        const numStr = num.toString();
        const parts = numStr.split('.');
        let intPart = parts[0];
        const decPart = parts[1];

        // Handle negative numbers
        const isNegative = intPart.startsWith('-');
        if (isNegative) intPart = intPart.slice(1);

        // Apply Indian numbering format
        if (intPart.length > 3) {
            let lastThree = intPart.slice(-3);
            let remaining = intPart.slice(0, -3);
            // Add comma every 2 digits for the remaining part
            remaining = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
            intPart = remaining + ',' + lastThree;
        }

        let result = isNegative ? '-' + intPart : intPart;
        if (decPart !== undefined) {
            result += '.' + decPart;
        }

        return result;
    };

    // Parse formatted string back to number
    const parseFormattedNumber = (str) => {
        if (!str) return '';
        // Remove all commas and currency symbol
        const cleaned = str.replace(/,/g, '').replace(currencySymbol, '').trim();
        // Return empty if not a valid number pattern
        if (!/^-?\d*\.?\d*$/.test(cleaned)) return '';
        return cleaned;
    };

    // Update display value when external value changes
    useEffect(() => {
        if (value !== undefined && value !== '') {
            setDisplayValue(formatIndianNumber(value));
        } else {
            setDisplayValue('');
        }
    }, [value]);

    const handleChange = (e) => {
        const inputValue = e.target.value;

        // Allow empty input
        if (!inputValue) {
            setDisplayValue('');
            onChange && onChange('');
            return;
        }

        // Remove existing commas to get raw input
        const rawInput = inputValue.replace(/,/g, '');

        // Validate input - allow numbers, one decimal point, and optional negative
        if (!/^-?\d*\.?\d*$/.test(rawInput)) {
            return; // Don't update if invalid
        }

        // Don't allow more than 2 decimal places
        const parts = rawInput.split('.');
        if (parts[1] && parts[1].length > 2) {
            return;
        }

        // Format and display
        const formattedValue = formatIndianNumber(rawInput);
        setDisplayValue(formattedValue);

        // Send raw numeric value to parent
        onChange && onChange(rawInput);
    };

    const handleBlur = () => {
        // Clean up on blur - format properly
        if (displayValue) {
            const parsed = parseFormattedNumber(displayValue);
            if (parsed) {
                setDisplayValue(formatIndianNumber(parsed));
            }
        }
    };

    return (
        <div style={{ position: 'relative', ...style }}>
            <span style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                opacity: 0.6,
                pointerEvents: 'none',
                fontSize: '14px',
            }}>
                {currencySymbol}
            </span>
            <input
                type="text"
                inputMode="decimal"
                value={displayValue}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={placeholder}
                disabled={disabled}
                autoFocus={autoFocus}
                className={className}
                style={{
                    width: '100%',
                    padding: '12px',
                    paddingLeft: '28px',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255,255,255,0.5)',
                    fontSize: '14px',
                    ...props.inputStyle,
                }}
                {...props}
            />
        </div>
    );
};

export default CurrencyInput;
