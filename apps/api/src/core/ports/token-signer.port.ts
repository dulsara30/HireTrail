export interface AccessTokenPayload {
  sub: string; // userId
  sid: string; // sessionId
  iss?: string;
  aud?: string;
}

export interface TokenSigner {
  signAccessToken(payload: { userId: string; sessionId: string }): string;
  verifyAccessToken(token: string): AccessTokenPayload;
}
