export const handleAuthenticate = () => {
    const cognitoUrl = process.env.NEXT_PUBLIC_COGNITO_URL
    window.location.href = cognitoUrl || ""
  }