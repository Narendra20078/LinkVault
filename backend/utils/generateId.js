import { customAlphabet } from 'nanoid';

// Generate a hard-to-guess URL-safe ID
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const generateId = customAlphabet(alphabet, 12);

export default generateId;
