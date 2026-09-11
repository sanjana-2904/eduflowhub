export type DashboardRole = 'admin' | 'instructor' | 'student';

export function dashboardPathForRole(role: DashboardRole): string {
  if (role === 'admin') return '/admin';
  if (role === 'instructor') return '/instructor';
  return '/student';
}

export function loginCodeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = message.toLowerCase();

  if (
    normalized.includes('signups not allowed') ||
    normalized.includes('user not found') ||
    normalized.includes('email not found')
  ) {
    return 'No account is registered with this email. Please register first.';
  }

  if (normalized.includes('expired')) {
    return 'Verification code has expired. Please request a new code.';
  }

  if (
    normalized.includes('invalid') ||
    normalized.includes('token') ||
    normalized.includes('otp')
  ) {
    return 'Invalid verification code. Please try again.';
  }

  if (normalized.includes('rate') || normalized.includes('too many')) {
    return 'Too many requests. Please wait before trying again.';
  }

  return 'Something went wrong. Please try again.';
}