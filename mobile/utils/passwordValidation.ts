/**
 * Validates if a password meets all requirements
 */
export const validatePassword = (password: string): boolean => {
  if (!password) return false;
  
  const requirements = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  ];
  
  return requirements.every((req) => req === true);
};

/**
 * Validates email format
 */
export const validateEmail = (email: string): boolean => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

