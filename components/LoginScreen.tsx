"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function LoginScreen() {
  const handleAuthenticate = () => {
    const cognitoUrl = process.env.NEXT_PUBLIC_COGNITO_URL
    window.location.href = cognitoUrl || ""
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8">
      <Card className="w-full max-w-sm sm:max-w-md lg:max-w-lg">
        <CardHeader className="text-center px-4 sm:px-6 py-4 sm:py-6">
          <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            Tests Neurocognitivos
          </CardTitle>
          <CardDescription className="text-sm sm:text-base text-gray-600 mt-2">
            Sistema de evaluación neuropsicológica
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
          <Button onClick={handleAuthenticate} className="w-full h-10 sm:h-12 text-sm sm:text-base font-medium">
            Authenticate
          </Button>

          <div className="text-center">
            <p className="text-xs sm:text-sm text-gray-600">Serás redirigido a AWS Cognito para autenticarte</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
