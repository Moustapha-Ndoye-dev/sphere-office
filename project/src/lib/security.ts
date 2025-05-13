import { supabase } from './supabase';
import { toast } from 'react-hot-toast';

// Rate limiting implementation
const rateLimits = new Map<string, { count: number; timestamp: number }>();

export async function rateLimit(key: string, maxAttempts: number, windowSeconds: number, increment = false): Promise<boolean> {
  const now = Date.now();
  const limit = rateLimits.get(key);
  
  // Clean up old entries
  if (limit && now - limit.timestamp > windowSeconds * 1000) {
    rateLimits.delete(key);
  }
  
  if (!limit) {
    if (increment) {
      rateLimits.set(key, { count: 1, timestamp: now });
    }
    return false;
  }
  
  if (limit.count >= maxAttempts) {
    return true;
  }
  
  if (increment) {
    limit.count++;
  }
  
  return false;
}

// Input validation
export function validateInput(input: unknown, type: 'email' | 'phone' | 'text' | 'number'): boolean {
  if (input === null || input === undefined) return false;
  
  switch (type) {
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input));
    case 'phone':
      return /^\+?[0-9]{10,}$/.test(String(input));
    case 'text':
      return typeof input === 'string' && input.length > 0 && !/[<>]/.test(input);
    case 'number':
      return !isNaN(Number(input)) && Number(input) >= 0;
    default:
      return false;
  }
}

// XSS Prevention
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// CSRF Protection
export function generateCsrfToken(): string {
  return crypto.randomUUID();
}

export function validateCsrfToken(token: string): boolean {
  const storedToken = sessionStorage.getItem('csrf_token');
  return token === storedToken;
}

// File Upload Validation
export async function validateFileUpload(file: File): Promise<boolean> {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!allowedTypes.includes(file.type)) {
    toast.error('Type de fichier non autorisé');
    return false;
  }
  
  if (file.size > maxSize) {
    toast.error('Fichier trop volumineux (max 5MB)');
    return false;
  }
  
  return true;
}

// Session Security
export function configureSessionSecurity() {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      // Régénérer le CSRF token à chaque connexion
      const newCsrfToken = generateCsrfToken();
      sessionStorage.setItem('csrf_token', newCsrfToken);
      
      // Configurer les cookies de session
      document.cookie = 'same-site=strict; secure';
    }
  });
}

// Headers Security
export const securityHeaders = {
  'Content-Security-Policy': 
    "default-src 'self'; " +
    "img-src 'self' https://images.unsplash.com data:; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co;",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};

// Password Validation
export function validatePassword(password: string): { isValid: boolean; message: string } {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (password.length < minLength) {
    return { isValid: false, message: 'Le mot de passe doit contenir au moins 8 caractères' };
  }
  
  if (!hasUpperCase || !hasLowerCase) {
    return { isValid: false, message: 'Le mot de passe doit contenir des majuscules et des minuscules' };
  }
  
  if (!hasNumbers) {
    return { isValid: false, message: 'Le mot de passe doit contenir au moins un chiffre' };
  }
  
  if (!hasSpecialChar) {
    return { isValid: false, message: 'Le mot de passe doit contenir au moins un caractère spécial' };
  }
  
  return { isValid: true, message: 'Mot de passe valide' };
}

// URL Validation
export function validateUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}

// SQL Injection Prevention
export function sanitizeSqlInput(input: string): string {
  return input.replace(/['";\\]/g, '');
}