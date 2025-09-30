// src/features/auth/api/exchangeTokens.ts
export type CognitoTokens = {
  access_token: string
  refresh_token?: string
  id_token: string
  expires_in: number
  token_type: 'Bearer'
}

export async function exchangeAuthCodeForTokens(params: {
  code: string
  redirectUri: string
  clientId: string
  tokenEndpoint: string
  codeVerifier: string
}): Promise<CognitoTokens> {
  const { code, redirectUri, clientId, tokenEndpoint, codeVerifier } = params

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  })

  const res = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Token exchange failed (${res.status}) ${text}`)
  }
  return res.json()
}
