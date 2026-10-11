export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  plan: string;
  emailVerified: boolean;
  sessionId?: string;
}

export interface TokenSigner {
  signAccessToken(payload: TokenPayload): string;
  verifyAccessToken(token: string): TokenPayload;
}
