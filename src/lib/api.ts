import axios from 'axios'
import { getAuthToken, useAuthStore } from '@/src/stores/auth'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL, 
  withCredentials: false, 
})

api.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
