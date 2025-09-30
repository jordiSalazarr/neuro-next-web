'use client'

export function useAuthenticate() {
  const redirect = () => {
    const cognitoUrl = process.env.NEXT_PUBLIC_COGNITO_URL
    if (!cognitoUrl) {
      console.error('Cognito URL not set')
      return
    }
    window.location.href = cognitoUrl
  }

  return { redirect }
}
