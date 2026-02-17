export function passwordGeneration(n: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@$!%*#?&';
  let password = '';
  for (let i = 0; i < n; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

