import NextAuth from "next-auth"
import GitHubProvider from "next-auth/providers/github"

const handler = NextAuth({
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
        async jwt({ token, account, profile }) {
            if (account) {
                token.accessToken = account.access_token
            }
            return token
        },
        async session({ session, token }) {
            // Send access token to the client session
            if (token.accessToken) {
                session.accessToken = token.accessToken;
            }
            return session
        },
        async redirect({ url, baseUrl }) {
            // Redirect to home page after successful login
            if (url.startsWith(baseUrl)) return url
            return `${baseUrl}/home`
        },
    },
})

export { handler as GET, handler as POST }
