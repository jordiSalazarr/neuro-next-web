
"use client"
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import axios from 'axios'
import { useRouter } from 'next/navigation'

function decodeJwt<T = any>(token: string): T | null {
  try {
    const [, payload] = token.split('.')
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}


const HomeScreen= () => {
    const setSession = useAuthStore((s) => s.setSession)
    const router = useRouter()

  useEffect(() => {
  const url = new URL(window.location.href)
  const code = url.searchParams.get("code")
  console.log(code)
  if (!code) return

  const verifier = sessionStorage.getItem("pkce_verifier") || ""
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id:process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID||"",
    code,
    redirect_uri:process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI||"",
    code_verifier: verifier,
  })
const cognitoGetTokensUrl = process.env.NEXT_PUBLIC_COGNITO_GET_TOKEN_URL ||""
  fetch(cognitoGetTokensUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
    .then(r => r.json())
    .then(tokens => {
      console.log(tokens)
      const claims = decodeJwt<any>(tokens.id_token) || {}
      const user = {
        id: claims.sub,
        name: claims.name || claims['cognito:username'] || '',
        email: claims.email || '',
        roles: claims['cognito:groups'] || [],
      }
       setSession(user, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
      })  
       })
}, [])
const handleShowHistory = () => {
  router.push("/history")
}

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 py-16">
      <div className="max-w-4xl w-full bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-4xl font-semibold text-center text-gray-800 mb-8">
          Bienvenido a la Evaluación de Salud
        </h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {/* Card para iniciar un nuevo test */}
          <Card className="border rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <h2 className="text-2xl font-medium text-gray-800">Iniciar nuevo test</h2>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Realiza un nuevo test de salud para conocer tu evaluación.
              </p>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Link href="/patient-selection">
                <Button className="bg-blue-600 text-white hover:bg-blue-700 w-full">
                  Iniciar Test
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* Card para ver historial */}
          <Card className="border rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <h2 className="text-2xl font-medium text-gray-800">Historial de Tests</h2>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Consulta los resultados de tus tests anteriores en cualquier momento.
              </p>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Link href="/history">
                <Button onClick={handleShowHistory} className="bg-gray-600 text-white hover:bg-gray-700 w-full">
                  Ver Historial
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default HomeScreen
