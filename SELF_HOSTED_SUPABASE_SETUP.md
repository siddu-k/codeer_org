# Self-Hosted Supabase Setup Guide for CODEER

## 🚀 Quick Setup for Self-Hosted Supabase

### 1. Database Schema Setup
1. Open your self-hosted Supabase dashboard
2. Go to **SQL Editor** 
3. Copy and paste the contents of `database/self_hosted_setup.sql`
4. Click **Run** to create all tables, indexes, functions, and triggers

### 2. Update Environment Variables
Update your `.env.local` file with your self-hosted Supabase credentials:

```env
# Supabase Configuration - Self-Hosted
NEXT_PUBLIC_SUPABASE_URL=http://your-supabase-host:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Verify Database Setup
After running the SQL, you should see these tables in your database:

#### Core Tables:
- ✅ **users** - User accounts with GitHub integration
- ✅ **teamup_posts** - Team collaboration posts  
- ✅ **team_slots** - Roles needed for teams
- ✅ **team_applications** - Applications to join teams
- ✅ **team_members** - Accepted team members
- ✅ **teamup_contacts** - Contact info for teams

#### Project Tables:
- ✅ **projects** - User project showcases
- ✅ **project_likes** - Project like tracking
- ✅ **project_comments** - Project comments
- ✅ **project_tags** - Project tags for discoverability

#### Pages Feature Tables:
- ✅ **user_pages** - GitHub Pages hosting
- ✅ **page_deployments** - Deployment tracking
- ✅ **donated_domains** - Community donated domains
- ✅ **donated_domain_usage** - Subdomain usage tracking

#### Views:
- ✅ **project_stats** - Project statistics per user
- ✅ **page_stats** - User page statistics

### 4. Features Supported

#### ✅ User Management
- GitHub OAuth integration
- Automatic user profile sync
- User profile management

#### ✅ Coding Problems
- GitHub problems fetching (already working)
- Local problems storage (already working)
- Problems browsing and filtering (already working)

#### ✅ Team Collaboration
- TeamUp posts for finding collaborators
- Team applications and member management
- Multiple contact methods support
- Role-based team structure

#### ✅ Project Showcase
- Project publishing with rich metadata
- Like and comment system
- Project categorization and tagging
- Featured projects support
- View tracking

#### ✅ GitHub Pages Hosting
- Subdomain management
- Deployment tracking
- Donated domain support
- File and storage tracking

### 5. Security Features
- **Row Level Security**: Ready to enable if needed
- **Type Safety**: All tables use proper data types
- **Constraints**: Data validation at database level
- **Indexes**: Optimized queries for performance

### 6. Next Steps

1. **Test Connection**: Start your app and verify database connectivity
2. **User Sync**: Sign in with GitHub to test user creation
3. **Data Validation**: Check that all tables are created correctly
4. **Performance**: Monitor query performance with the created indexes

### 7. Production Considerations

For production use:
- Enable Row Level Security (RLS) if needed
- Encrypt sensitive data like Cloudflare API tokens
- Set up regular backups
- Monitor database performance
- Consider connection pooling

## 🔧 Troubleshooting

### Common Issues:
1. **Connection Error**: Verify your SUPABASE_URL and ANON_KEY
2. **Permission Denied**: Make sure your Supabase user has proper permissions
3. **Table Not Found**: Ensure the SQL script ran completely without errors
4. **Invalid URL Error**: Check for duplicate environment variable declarations in `.env.local`

### Specific Error Fixes:

#### "Invalid URL" Error
If you see a runtime TypeError with "Invalid URL", check your `.env.local` file:

**❌ Wrong:**
```env
NEXT_PUBLIC_SUPABASE_URL=NEXT_PUBLIC_SUPABASE_URL=https://db.codeer.org
```

**✅ Correct:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://db.codeer.org
```

Make sure there are no duplicate variable names or extra `=` signs.

#### "Error fetching teamup posts: {}" Error
This error occurs when the teamup-related tables don't exist in your database yet, OR there are hosting/connection issues.

**Solution 1 - Verify Tables:**
1. Go to your Supabase dashboard
2. Open **SQL Editor**
3. Run the complete `database/self_hosted_setup.sql` script
4. Verify these tables were created:
   - `teamup_posts`
   - `team_slots` 
   - `teamup_contacts`
   - `team_applications`
   - `team_members`

**Solution 2 - If Tables Exist, Check Hosting Issues:**

**🚨 CRITICAL: Blank Page at db.codeer.org**
If `https://db.codeer.org/` shows a blank white page, your Supabase instance is NOT running properly.

**Common Self-Hosted Supabase Issues:**

1. **Supabase Services Not Running**: 
   ```bash
   # Check if Docker containers are running
   docker ps | grep supabase
   
   # Or check systemd services
   systemctl status supabase
   ```

2. **Domain/DNS Issues**: 
   - Verify `db.codeer.org` points to your server IP
   - Check DNS propagation: `nslookup db.codeer.org`
   - Ensure SSL certificate is valid

3. **Reverse Proxy Configuration**: 
   Your Nginx/Apache should route requests properly:
   ```nginx
   # Example Nginx config for db.codeer.org
   server {
       listen 443 ssl;
       server_name db.codeer.org;
       
       location / {
           proxy_pass http://localhost:8000;  # Supabase Studio
           proxy_set_header Host $host;
       }
       
       location /rest/ {
           proxy_pass http://localhost:3000;  # PostgREST
           proxy_set_header Host $host;
       }
       
       location /auth/ {
           proxy_pass http://localhost:9999;  # GoTrue Auth
           proxy_set_header Host $host;
       }
   }
   ```

4. **PostgREST Not Running**: 
   The `/rest/v1/` endpoint should return API documentation, not a blank page

5. **Environment Configuration**: 
   Check your Supabase `.env` file has correct settings:
   ```env
   POSTGRES_HOST=localhost
   POSTGRES_DB=postgres
   POSTGRES_PORT=5432
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=your-password
   
   SITE_URL=https://db.codeer.org
   API_EXTERNAL_URL=https://db.codeer.org
   ```

**Quick Fix Steps:**

1. **Restart Supabase Services**:
   ```bash
   # If using Docker
   docker-compose down && docker-compose up -d
   
   # If using systemd
   sudo systemctl restart supabase
   ```

2. **Check Service Status**:
   ```bash
   # These should all be running:
   curl http://localhost:3000  # PostgREST
   curl http://localhost:8000  # Supabase Studio  
   curl http://localhost:9999  # GoTrue Auth
   ```

3. **Test Endpoints**:
   Visit: `http://localhost:3000` directly (should show PostgREST API docs)

4. **Check Logs**:
   ```bash
   # Docker logs
   docker-compose logs -f
   
   # System logs  
   journalctl -u supabase -f
   ```

**Quick Diagnostic Steps:**

1. **Test Direct API Access:**
   ```bash
   curl -H "apikey: YOUR_ANON_KEY" https://db.codeer.org/rest/v1/teamup_posts
   ```

2. **Check Browser Network Tab:**
   - Open DevTools → Network tab
   - Try the teamup functionality
   - Look for failed requests or CORS errors

3. **Verify Environment Variables:**
   ```env
   # Make sure these are exactly correct
   NEXT_PUBLIC_SUPABASE_URL=https://db.codeer.org
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-exact-anon-key
   ```

4. **Test with Simple Query:**
   Run this in your SQL Editor:
   ```sql
   SELECT COUNT(*) FROM teamup_posts;
   ```

**Quick Check:**
Run this query in your SQL Editor to verify tables exist:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%teamup%';
```

You should see 4-5 teamup-related tables listed.

#### Environment Variable Format
Your `.env.local` should look like this:
```env
# Supabase Configuration - Self-Hosted
NEXT_PUBLIC_SUPABASE_URL=https://db.codeer.org
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

### Database Reset:
If you need to reset the database, the SQL script includes DROP statements at the beginning to clean up existing tables.

---

Your self-hosted Supabase database is now ready for the CODEER platform! 🎉

## Features Ready to Use:
- ✅ GitHub user authentication and sync
- ✅ Coding problems (already working)
- ✅ Team collaboration features
- ✅ Project showcasing
- ✅ GitHub Pages hosting
- ✅ Community domain sharing
- ✅ Real-time features (built into Supabase)
- ✅ File storage support (Supabase storage buckets)
