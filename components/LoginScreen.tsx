import { motion } from "framer-motion"
import { LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthenticate } from "@/src/features/auth/hooks/useAuthenticate"

export function LoginScreen() {
    const { redirect } = useAuthenticate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-100 p-4 sm:p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm sm:max-w-md lg:max-w-lg"
      >
        <Card className="shadow-xl rounded-2xl border border-gray-200/70 backdrop-blur-sm">
          <CardHeader className="text-center px-4 sm:px-6 py-6">
            <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              NeuroSuite
            </CardTitle>
            <CardDescription className="text-sm sm:text-base text-gray-600 mt-2">
              Sistema de evaluación neuropsicológica
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-6 space-y-5">
            <Button
              onClick={redirect}
              className="w-full h-11 sm:h-12 text-sm sm:text-base font-medium gap-2"
            > 
                  <LogIn className="h-4 w-4" />
                  Autenticarse
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
