import { toast } from 'react-hot-toast';

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
      return !Number.isNaN(Number(input)) && Number(input) >= 0;
  }
}

export async function validateFileUpload(file: File): Promise<boolean> {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024;

  if (!allowedTypes.includes(file.type)) {
    toast.error('Type de fichier non autorise');
    return false;
  }

  if (file.size > maxSize) {
    toast.error('Fichier trop volumineux (max 5MB)');
    return false;
  }

  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isJpeg = signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
  const isPng = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    .every((byte, index) => signature[index] === byte);
  const isWebp =
    String.fromCharCode(...signature.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...signature.slice(8, 12)) === 'WEBP';
  const signatureMatches =
    (file.type === 'image/jpeg' && isJpeg) ||
    (file.type === 'image/png' && isPng) ||
    (file.type === 'image/webp' && isWebp);

  if (!signatureMatches) {
    toast.error('Le contenu du fichier ne correspond pas a une image valide');
    return false;
  }

  return true;
}

export function validatePassword(password: string): { isValid: boolean; message: string } {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < 8) {
    return { isValid: false, message: 'Le mot de passe doit contenir au moins 8 caracteres' };
  }

  if (!hasUpperCase || !hasLowerCase) {
    return { isValid: false, message: 'Le mot de passe doit contenir des majuscules et des minuscules' };
  }

  if (!hasNumbers) {
    return { isValid: false, message: 'Le mot de passe doit contenir au moins un chiffre' };
  }

  if (!hasSpecialChar) {
    return { isValid: false, message: 'Le mot de passe doit contenir au moins un caractere special' };
  }

  return { isValid: true, message: 'Mot de passe valide' };
}
