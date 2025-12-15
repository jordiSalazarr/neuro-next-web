'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { exchangeAuthCodeForTokens } from '../api/exchangeTokens'
import { useAuthStore } from '@/src/stores/auth'

export function useCognitoCallback(options?: { redirectPath?: string }) {
  const redirectPath = options?.redirectPath ?? '/home'
  const search = useSearchParams()
  const router = useRouter()
  const setSession = useAuthStore((s) => s.setSession)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ran = useRef(false)

  useEffect(() => {
    const code = search.get('code')
    if (!code || ran.current) return
    ran.current = true

      ; (async () => {
        try {
          setLoading(true)
          setError(null)

          const redirectUri = `${window.location.origin}${redirectPath}`
          const codeVerifier = sessionStorage.getItem('pkce_verifier') || ''
          const tokens = await exchangeAuthCodeForTokens({
            code,
            redirectUri,
            clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
            tokenEndpoint: process.env.NEXT_PUBLIC_COGNITO_GET_TOKEN_URL || '',
            codeVerifier,
          })

          if (!tokens.id_token) throw new Error('Missing id_token in response')

          const claims = decodeJwt<Record<string, any>>(tokens.id_token) || {}
          const user = {
            id: claims.sub as string,
            name: (claims.name || claims['cognito:username'] || '') as string,
            email: (claims.email || '') as string,
            roles: (claims['cognito:groups'] || []) as string[],
          }

          setSession(
            user,
            {
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token || '',
              expiresAt: Math.floor(Date.now() / 1000) + Number(tokens.expires_in || 0),
            },
            Number(tokens.expires_in || 3600) // Pass expiration time in seconds (default 1 hour)
          )

          // higiene: limpiar verifier y el param ?code de la URL
          sessionStorage.removeItem('pkce_verifier')
          const url = new URL(window.location.href)
          url.searchParams.delete('code')
          window.history.replaceState({}, document.title, url.toString())

          router.replace(redirectPath)
        } catch (e: any) {
          setError(e?.message ?? 'Authentication callback failed')
          console.error('[CognitoCallback]', e)
        } finally {
          setLoading(false)
        }
      })()
  }, [search, router, redirectPath, setSession])

  return { loading, error }
}


function decodeJwt<T = any>(token: string): T | null {
  try {
    const [, payload] = token.split('.')
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}