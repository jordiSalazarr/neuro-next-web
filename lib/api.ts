// lib/api.ts
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE, // p.ej. https://api.tu-dominio.com
  withCredentials: false, // si usas cookies, pon true
})

// Request interceptor: añade Bearer si hay token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().tokens?.accessToken
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
