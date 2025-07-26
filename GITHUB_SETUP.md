# GitHub OAuth Setup Instructions

To enable GitHub authentication in Codeer, you need to create a GitHub OAuth App:

## Step 1: Create a GitHub OAuth App

1. Go to GitHub Settings: https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: Codeer
   - **Homepage URL**: http://localhost:3000
   - **Application description**: Open-source coding platform
   - **Authorization callback URL**: http://localhost:3000/api/auth/callback/github

## Step 2: Update Environment Variables

After creating the OAuth App, GitHub will provide you with:
- Client ID
- Client Secret

Update your `.env.local` file with these values:

```env
GITHUB_CLIENT_ID=your_actual_client_id_here
GITHUB_CLIENT_SECRET=your_actual_client_secret_here
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

## Step 3: Generate NEXTAUTH_SECRET

Run this command to generate a secure secret:
```bash
openssl rand -base64 32
```

Or use any secure random string generator.

## Step 4: Restart the Development Server

After updating the environment variables, restart your Next.js development server:
```bash
npm run dev
```

Now the GitHub authentication should work!
