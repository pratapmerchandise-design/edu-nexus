export const passwordRules = [
  ['At least 8 characters', (p: string) => p.length >= 8],
  ['One uppercase letter', (p: string) => /[A-Z]/.test(p)],
  ['One lowercase letter', (p: string) => /[a-z]/.test(p)],
  ['One number', (p: string) => /\d/.test(p)],
  ['One special character', (p: string) => /[^A-Za-z0-9]/.test(p)],
] as const;
export const isStrongPassword = (p: string) => passwordRules.every(([, test]) => test(p));
