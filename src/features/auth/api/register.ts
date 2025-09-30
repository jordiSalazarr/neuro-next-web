import api from "@/src/lib/api"
import { User } from "./dto"

  export async function registerUserData(name: string, mail: string, roles: string[]): Promise<User | undefined> {
    if (!mail || !name) return
    const res = await api.post(
      `/v1/auth/user/${encodeURIComponent(mail)}/${encodeURIComponent(
        name,
      )}`,
    )
    const newUser: User = {
      id: res.data.user.ID,
      name: name,
      email: mail,
      roles: roles,
    }
    return newUser
  }