# Supabase Setup Guide for CODEER

## 🚀 Quick Setup Steps

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login with GitHub
3. Click "New Project"
4. Choose your organization
5. Fill in project details:
   - Name: `codeer-platform`
   - Database Password: (generate a strong password)
   - Region: Choose closest to your users

### 2. Get Project Credentials
1. Go to Project Settings → API
2. Copy these values:
   - **Project URL**: `https://your-project-ref.supabase.co`
   - **Anon/Public Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3. Environment Variables
Create `.env.local` file with:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Run Database Schema
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `database/schema.sql`
3. Click "Run" to create all tables and policies

### 5. Test Connection
1. Start your Next.js app: `npm run dev`
2. Sign in with GitHub
3. Check browser console for "User synced with Supabase" message
4. Go to Supabase Dashboard → Table Editor → users table
5. You should see your user data!

## 🗄️ Database Tables Created

- **users**: Store GitHub user information
- **problems**: Coding challenges and algorithm problems
- **projects**: User project showcases
- **teamups**: Collaboration opportunities
- **learning_docs**: Educational content and tutorials

## 🔐 Security Features

- **Row Level Security (RLS)**: Users can only access their own data
- **JWT Authentication**: Secure token-based auth
- **Data Validation**: Type-safe database operations
- **Auto-timestamps**: Created/updated timestamps

## 📊 Features Ready to Use

1. **User Management**: Automatic GitHub → Supabase sync
2. **Data Storage**: All tables ready for your Quick Create features
3. **Real-time**: Built-in real-time subscriptions
4. **File Storage**: Ready for project files and images

## 🔧 Next Steps

1. Implement Quick Create forms to save data
2. Add real-time collaboration features
3. Set up file storage for project uploads
4. Create admin dashboard for content moderation

Your Supabase backend is now ready for the CODEER platform! 🎉
