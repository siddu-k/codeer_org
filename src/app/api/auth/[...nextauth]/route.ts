import NextAuth, { AuthOptions } from "next-auth"
import GitHubProvider from "next-auth/providers/github"
import { supabase } from "@/lib/supabase"

export const authOptions: AuthOptions = {
    providers: [
        GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: "read:user user:email repo"
                }
            }
        })
    ],
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async signIn({ user, account, profile }) {
            try {
                if (user.email) {
                    // Check if user exists in our database
                    const { data: existingUser } = await supabase
                        .from('users')
                        .select('*')
                        .eq('email', user.email)
                        .single()

                    if (!existingUser) {
                        // Create new user in our database
                        const githubProfile = profile as any
                        const { error } = await supabase
                            .from('users')
                            .insert({
                                email: user.email,
                                display_name: user.name || githubProfile?.name || 'Unknown User',
                                avatar_url: user.image || githubProfile?.avatar_url,
                                github_username: githubProfile?.login
                            })

                        if (error) {
                            console.error('Error creating user:', error)
                            return false
                        }
                    }
                }
                return true
            } catch (error) {
                console.error('Error in signIn callback:', error)
                return false
            }
        },
        async jwt({ token, account, profile }) {
            if (account) {
                token.accessToken = account.access_token
            }
            return token
        },
        async session({ session, token }) {
            // Send access token to the client session
            if (token.accessToken) {
                (session as any).accessToken = token.accessToken;
            }
            return session
        },
        async redirect({ url, baseUrl }) {
            // Redirect to home page after successful login
            if (url.startsWith(baseUrl)) return url
            return `${baseUrl}/home`
        },
    },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
