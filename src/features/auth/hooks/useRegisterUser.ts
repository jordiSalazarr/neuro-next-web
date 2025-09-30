import { useState } from "react";
import { registerUserData } from "../api/register";
import { useAuthStore } from "@/src/stores/auth";

export function useRegisterUser() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const setSession = useAuthStore(state => state.setSession);
    const tokens = useAuthStore(state => state.tokens);
    const register = async (name: string, email: string, roles: string[]) => {
        setLoading(true);
        setError(null);
        try {
            const user = await registerUserData(name, email, roles);
            if (user && tokens) { 
                setSession(user,tokens)
             };
            return user;
        } catch (error:any) {
            setError(error?.message ?? 'Failed to register user')
        } finally {
            setLoading(false);
        }
    }
    return { register, loading, error };
}