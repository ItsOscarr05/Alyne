/**
 * Validates if a password meets all requirements
 */
/**
 * Calculate password strength
 */
const calculatePasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  if (!password) return 'weak';
  
  let score = 0;
  
  // Length scoring
  if (password.length >= 12) score += 2;
  else if (password.length >= 8) score += 1;
  
  // Character variety scoring
  if (/[a-z]/.test(password)) score += 1; // lowercase
  if (/[A-Z]/.test(password)) score += 1; // uppercase
  if (/[0-9]/.test(password)) score += 1; // number
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1; // special
  
  // Determine strength
  if (score >= 5) return 'strong';
  if (score >= 3) return 'medium';
  return 'weak';
};

/**
 * Validates password - requires at least medium strength
 */
export const validatePassword = (password: string): boolean => {
  if (!password) return false;
  const strength = calculatePasswordStrength(password);
  return strength === 'medium' || strength === 'strong';
};

/**
 * Validates email format
 */
export const validateEmail = (email: string): boolean => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

