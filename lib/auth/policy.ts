export const AUTH_POLICY = {
  session: {
    idleTtlMs: 7 * 24 * 60 * 60 * 1000,
    absoluteTtlMs: 30 * 24 * 60 * 60 * 1000,
    cookieName: "sogur_session",
  },
  verification: {
    emailTtlMs: 24 * 60 * 60 * 1000,
    passwordResetTtlMs: 60 * 60 * 1000,
  },
  login: {
    attemptsPerWindow: 5,
    windowMs: 15 * 60 * 1000,
  },
} as const;
