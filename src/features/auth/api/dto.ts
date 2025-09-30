export type User = {
     id: string,
      name:string,
      email: string,
      roles: string[],
}

 export type Tokens = {
  accessToken: string
  refreshToken?: string
  expiresAt?: number // epoch seconds (opcional)
}