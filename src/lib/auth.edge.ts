/**
 * Edge-compatible NextAuth instance for middleware.
 * Does NOT import prisma, bcrypt, or any Node.js-only modules.
 */
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export const { auth } = NextAuth(authConfig);
