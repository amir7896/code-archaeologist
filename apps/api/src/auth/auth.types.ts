export type RequestUser = {
  id: string;
  email: string;
  name: string;
  sessionId: string;
};

export type AccessTokenPayload = {
  sub: string;
  email: string;
  sid: string;
  typ: 'access';
};

export type RefreshTokenPayload = {
  sub: string;
  sid: string;
  typ: 'refresh';
};
