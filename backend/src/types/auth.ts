export type LoginSuccess = {
  type: "OK"
  tokenAcceso: string
  tokenRefresco: string
}

export type LoginTwoFactorRequired = {
  type: "2FA_REQUIRED"
  tokenTemporal: string
}

export type LoginResult = LoginSuccess | LoginTwoFactorRequired

export type SafeUser = {
  id: number
  username: string
  email: string
  role: string
  avatar_url?: string | null
  bio?: string | null
  is_verified?: boolean | null
  two_factor_enabled?: boolean | null
}
