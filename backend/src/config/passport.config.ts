import passport from "passport"
import { Strategy as GoogleStrategy } from "passport-google-oauth20"
import { prisma } from "../lib/prisma.js"
import { randomBytes } from "crypto"

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      // Buscar o crear usuario en DB
      try {
        const email = profile.emails?.[0].value!

        // Buscar si ya existe
        let usuario = await prisma.users.findUnique({ where: { email } })

        // Si no existe, lo creamos
        if (!usuario) {
          // Crearlo sin password
          usuario = await prisma.users.create({
            data: {
              email,
              username: profile.displayName,
              password: randomBytes(32).toString("hex"), // string random, nunca va a matchear
              google_id: profile.id,
              is_verified: true, // Google ya verificó el email
            },
          })
        } else if (!usuario.google_id) {
          // Ya existe con email/password → vincular cuenta de Google
          usuario = await prisma.users.update({
            where: { email },
            data: { google_id: profile.id },
          })
        }
        return done(null, usuario)
      } catch (error) {
        console.error("Error en inicio de sesión con Google:", error)
        return done(error)
      }
    }
  )
)
