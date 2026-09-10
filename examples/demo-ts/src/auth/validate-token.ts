export type Session = {
  userId: string;
  token: string;
};

export function validateToken(token: string): Session | null {
  if (!token || token.length < 8) {
    return null;
  }
  return { userId: token.slice(0, 8), token };
}
