// Random username generator for the social/leaderboard feature
// Format: AdjectiveNoun_Number (e.g., "CosmicPanda_42")

const ADJECTIVES = [
  'Cosmic', 'Swift', 'Silent', 'Bold', 'Neon', 'Brave', 'Gentle', 'Fierce',
  'Mystic', 'Lunar', 'Solar', 'Arctic', 'Crimson', 'Golden', 'Shadow',
  'Thunder', 'Crystal', 'Ember', 'Frost', 'Zen', 'Pixel', 'Turbo',
  'Quantum', 'Nova', 'Hyper', 'Chill', 'Epic', 'Astral', 'Vivid', 'Stealth',
  'Lucky', 'Rapid', 'Iron', 'Bright', 'Storm', 'Cyber', 'Blaze', 'Dusk',
  'Prime', 'Ultra', 'Nifty', 'Jolly', 'Witty', 'Keen', 'Noble', 'Wild',
  'Zippy', 'Rustic', 'Slick', 'Clever', 'Mighty', 'Serene', 'Velvet',
  'Radiant', 'Nimble', 'Steady', 'Daring', 'Crisp', 'Lively', 'Gleam',
];

const NOUNS = [
  'Panda', 'Wolf', 'Eagle', 'Tiger', 'Phoenix', 'Dragon', 'Falcon', 'Otter',
  'Lynx', 'Fox', 'Hawk', 'Bear', 'Raven', 'Shark', 'Cobra', 'Jaguar',
  'Storm', 'Flame', 'Comet', 'Ninja', 'Spark', 'Knight', 'Arrow', 'Sage',
  'Ghost', 'Drift', 'Pulse', 'Cipher', 'Orbit', 'Blaze', 'Rider', 'Rover',
  'Viper', 'Atlas', 'Echo', 'Fang', 'Bolt', 'Crest', 'Peak', 'Flare',
  'Prowl', 'Quest', 'Apex', 'Rogue', 'Titan', 'Forge', 'Glide', 'Haven',
  'Nexus', 'Scout', 'Surge', 'Trail', 'Dune', 'Reef', 'Claw', 'Wing',
  'Dash', 'Frost', 'Thorn', 'Shade',
];

/**
 * Generate a random username in the format: AdjectiveNoun_Number
 * e.g., "CosmicPanda_42", "SwiftTiger_91"
 * @returns {string} A randomly generated username
 */
export function generateUsername() {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const number = String(Math.floor(Math.random() * 100)).padStart(2, '0');
  return `${adjective}${noun}_${number}`;
}

/**
 * Generate multiple unique username options
 * @param {number} count - Number of usernames to generate
 * @returns {string[]} Array of unique usernames
 */
export function generateUsernameOptions(count = 5) {
  const usernames = new Set();
  while (usernames.size < count) {
    usernames.add(generateUsername());
  }
  return Array.from(usernames);
}
