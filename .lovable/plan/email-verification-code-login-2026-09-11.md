# Email verification-code login

## What will change
- Replace the password form on the Login page with a two-step email verification-code flow.
- First step: accept a registered email and send a secure six-digit code without creating new accounts.
- Second step: show a six-digit code input, verify and sign in, allow changing the email, and enable resend after 60 seconds.
- Redirect successful sign-ins to the student, instructor, or admin dashboard based on the existing saved role.
- Keep registration, existing users, profiles, roles, password recovery, and all account data unchanged.

## Security and behavior
- Use Lovable Cloud's built-in email OTP authentication rather than a separate OTP table or custom secret handling.
- Code generation, protected storage, expiration, attempt controls, one-time use, and invalidation remain server-managed.
- Prevent account creation from the login form and show clear messages for unregistered emails, invalid codes, expired codes, and rate limits.
- Keep codes out of browser storage, URLs, logs, and API responses.
- Disable repeated send/verify actions while a request is running.

## Technical details
- Extend the authentication context with `requestLoginCode` and `verifyLoginCode` methods using the existing auth client.
- Request codes with account creation disabled and verify them as email OTPs.
- Rework the existing Login page in the current EduFlow visual style using the existing six-slot code input.
- Add focused tests for email entry, code entry, countdown/resend state, error handling, and role-based navigation.
- Verify the production build and exercise the flow in the browser without consuming a real user's code.
