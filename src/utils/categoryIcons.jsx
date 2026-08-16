import React from 'react';
import {
    Utensils, Coffee, Car, Fuel, ShoppingBag, Shirt, 
    Zap, Home, Film, Gamepad2, HeartPulse, Pill, 
    Dumbbell, Plane, GraduationCap, BookOpen, Gift, 
    Package, Sparkles, Wrench, Smartphone, Wifi, 
    CreditCard, TrendingUp, Wallet, ShieldCheck, 
    Music, Tv, Baby, Dog, DollarSign, Tag, Layers,
    Receipt, Globe, Briefcase, Smile, Store
} from 'lucide-react';

export const CATEGORY_ICON_LIST = [
    { id: 'utensils', label: 'Food & Dining', icon: Utensils },
    { id: 'coffee', label: 'Coffee & Drinks', icon: Coffee },
    { id: 'car', label: 'Transport / Car', icon: Car },
    { id: 'fuel', label: 'Fuel / Gas', icon: Fuel },
    { id: 'shopping-bag', label: 'Shopping', icon: ShoppingBag },
    { id: 'shirt', label: 'Clothing', icon: Shirt },
    { id: 'zap', label: 'Bills & Utilities', icon: Zap },
    { id: 'home', label: 'Rent & Housing', icon: Home },
    { id: 'film', label: 'Movies & Shows', icon: Film },
    { id: 'gamepad-2', label: 'Gaming', icon: Gamepad2 },
    { id: 'heart-pulse', label: 'Health & Medical', icon: HeartPulse },
    { id: 'pill', label: 'Pharmacy', icon: Pill },
    { id: 'dumbbell', label: 'Gym & Fitness', icon: Dumbbell },
    { id: 'plane', label: 'Travel & Trips', icon: Plane },
    { id: 'graduation-cap', label: 'Education', icon: GraduationCap },
    { id: 'book-open', label: 'Books', icon: BookOpen },
    { id: 'gift', label: 'Gifts & Charity', icon: Gift },
    { id: 'package', label: 'Deliveries', icon: Package },
    { id: 'sparkles', label: 'Personal Care', icon: Sparkles },
    { id: 'wrench', label: 'Maintenance & Tools', icon: Wrench },
    { id: 'smartphone', label: 'Mobile Recharge', icon: Smartphone },
    { id: 'wifi', label: 'Internet / Wi-Fi', icon: Wifi },
    { id: 'credit-card', label: 'Banking & EMIs', icon: CreditCard },
    { id: 'trending-up', label: 'Investments', icon: TrendingUp },
    { id: 'dog', label: 'Pets', icon: Dog },
    { id: 'baby', label: 'Kids & Family', icon: Baby },
    { id: 'briefcase', label: 'Work', icon: Briefcase },
    { id: 'wallet', label: 'General / Wallet', icon: Wallet },
];

const EMOJI_TO_ICON_MAP = {
    '🍔': 'utensils',
    '🍽️': 'utensils',
    '🍕': 'utensils',
    '☕': 'coffee',
    '🚗': 'car',
    '🚕': 'car',
    '⛽': 'fuel',
    '🛒': 'shopping-bag',
    '🛍️': 'shopping-bag',
    '👕': 'shirt',
    '👗': 'shirt',
    '💡': 'zap',
    '⚡': 'zap',
    '🏠': 'home',
    '🎬': 'film',
    '🍿': 'film',
    '🎮': 'gamepad-2',
    '🏥': 'heart-pulse',
    '💊': 'pill',
    '🏋️': 'dumbbell',
    '💪': 'dumbbell',
    '✈️': 'plane',
    '📚': 'book-open',
    '🎓': 'graduation-cap',
    '🎁': 'gift',
    '📦': 'package',
    '🐾': 'dog',
    '🐶': 'dog',
    '💅': 'sparkles',
    '✨': 'sparkles',
    '🔧': 'wrench',
    '👶': 'baby',
    '💻': 'smartphone',
    '📱': 'smartphone',
    '🎨': 'sparkles',
    '🍻': 'coffee',
    '📁': 'wallet',
    '💸': 'wallet',
    '💰': 'trending-up'
};

const NAME_KEYWORDS_MAP = [
    { keywords: ['food', 'dining', 'eat', 'restaurant', 'meal', 'lunch', 'dinner', 'breakfast', 'swiggy', 'zomato'], icon: 'utensils' },
    { keywords: ['coffee', 'tea', 'chai', 'cafe', 'drink', 'beverage', 'starbucks'], icon: 'coffee' },
    { keywords: ['fuel', 'petrol', 'diesel', 'gas'], icon: 'fuel' },
    { keywords: ['transport', 'car', 'cab', 'uber', 'ola', 'auto', 'metro', 'bus', 'vehicle', 'travel', 'flight'], icon: 'car' },
    { keywords: ['grocer', 'supermarket', 'blinkit', 'instamart', 'zepto', 'bigbasket', 'provisions'], icon: 'shopping-bag' },
    { keywords: ['shopping', 'clothes', 'clothing', 'lifestyle', 'apparel', 'amazon', 'myntra', 'flipkart'], icon: 'shirt' },
    { keywords: ['bill', 'utility', 'electricity', 'power', 'water', 'gas'], icon: 'zap' },
    { keywords: ['rent', 'home', 'housing', 'flat', 'apartment'], icon: 'home' },
    { keywords: ['movie', 'cinema', 'theatre', 'film', 'netflix', 'prime', 'hotstar', 'show'], icon: 'film' },
    { keywords: ['game', 'gaming', 'steam', 'playstation', 'xbox'], icon: 'gamepad-2' },
    { keywords: ['health', 'doctor', 'hospital', 'clinic', 'medical'], icon: 'heart-pulse' },
    { keywords: ['medicine', 'pharmacy', 'pill', 'drug', 'apollo', 'pharmeasy'], icon: 'pill' },
    { keywords: ['fitness', 'gym', 'workout', 'training', 'sports'], icon: 'dumbbell' },
    { keywords: ['trip', 'tour', 'flight', 'airline', 'hotel', 'stay'], icon: 'plane' },
    { keywords: ['education', 'course', 'school', 'college', 'tuition', 'study'], icon: 'graduation-cap' },
    { keywords: ['book', 'read', 'magazine', 'library'], icon: 'book-open' },
    { keywords: ['gift', 'donation', 'charity', 'present'], icon: 'gift' },
    { keywords: ['delivery', 'courier', 'package'], icon: 'package' },
    { keywords: ['personal', 'salon', 'spa', 'beauty', 'care', 'cosmetics'], icon: 'sparkles' },
    { keywords: ['maintenance', 'repair', 'tool', 'service', 'mechanic'], icon: 'wrench' },
    { keywords: ['mobile', 'phone', 'recharge', 'airtel', 'jio', 'vi'], icon: 'smartphone' },
    { keywords: ['wifi', 'internet', 'broadband', 'fiber'], icon: 'wifi' },
    { keywords: ['emi', 'loan', 'credit', 'card', 'bank', 'interest'], icon: 'credit-card' },
    { keywords: ['investment', 'stock', 'mutual', 'sip', 'trading', 'crypto', 'gold'], icon: 'trending-up' },
    { keywords: ['pet', 'dog', 'cat', 'vet'], icon: 'dog' },
];

/**
 * Returns the matching Lucide Icon component.
 */
export const getCategoryIconComponent = (iconIdOrEmoji, fallbackName = '') => {
    let iconKey = iconIdOrEmoji;

    // 1. Direct ID match
    let found = CATEGORY_ICON_LIST.find(i => i.id === iconKey);
    if (found) return found.icon;

    // 2. Emoji match
    if (EMOJI_TO_ICON_MAP[iconKey]) {
        iconKey = EMOJI_TO_ICON_MAP[iconKey];
        found = CATEGORY_ICON_LIST.find(i => i.id === iconKey);
        if (found) return found.icon;
    }

    // 3. Match by name keywords
    if (fallbackName && typeof fallbackName === 'string') {
        const lower = fallbackName.toLowerCase();
        for (const entry of NAME_KEYWORDS_MAP) {
            if (entry.keywords.some(k => lower.includes(k))) {
                found = CATEGORY_ICON_LIST.find(i => i.id === entry.icon);
                if (found) return found.icon;
            }
        }
    }

    return Wallet;
};

/**
 * React Component for rendering minimal category icons
 */
export const CategoryIcon = ({ icon, name = '', size = 18, color = 'currentColor', strokeWidth = 2, className = '' }) => {
    const IconComp = getCategoryIconComponent(icon, name);
    return <IconComp size={size} color={color} strokeWidth={strokeWidth} className={className} />;
};

export default CategoryIcon;
