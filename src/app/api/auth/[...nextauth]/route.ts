import NextAuth, { AuthOptions } from "next-auth"
import GitHubProvider from "next-auth/providers/github"
import CredentialsProvider from "next-auth/providers/credentials"
import { supabase } from "@/lib/supabase"

export const authOptions: AuthOptions = {
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                try {
                    // Sign in with Supabase Auth
                    const { data, error } = await supabase.auth.signInWithPassword({
                        email: credentials.email,
                        password: credentials.password,
                    });

                    if (error || !data.user) {
                        console.error('Supabase auth error:', error);
                        return null;
                    }

                    // Get user profile from our users table
                    const { data: userProfile } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', data.user.id)
                        .single();

                    return {
                        id: data.user.id,
                        email: data.user.email,
                        name: userProfile?.display_name || data.user.email?.split('@')[0],
                        image: userProfile?.avatar_url,
                    };
                } catch (error) {
                    console.error('Auth error:', error);
                    return null;
                }
            }
        }),
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
                    // Only handle GitHub users here (credentials users are handled in authorize)
                    if (account?.provider === 'github') {
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
                                    github_username: githubProfile?.login,
                                    total_xp: 0,
                                    problems_solved: 0,
                                    current_streak: 0,
                                    max_streak: 0
                                })

                            if (error) {
                                console.error('Error creating user:', error)
                                return false
                            }
                        } else {
                            // Update existing user with latest GitHub data
                            const githubProfile = profile as any
                            await supabase
                                .from('users')
                                .update({
                                    display_name: user.name || githubProfile?.name || existingUser.display_name,
                                    avatar_url: user.image || githubProfile?.avatar_url || existingUser.avatar_url,
                                    github_username: githubProfile?.login || existingUser.github_username,
                                    updated_at: new Date().toISOString()
                                })
                                .eq('email', user.email)
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
