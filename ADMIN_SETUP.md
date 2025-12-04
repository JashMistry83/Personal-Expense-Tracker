# Admin Setup Guide

## Setting Up Admin Access

To enable admin functionality, you need to set the `ADMIN_EMAILS` and `ADMIN_PASSWORD` environment variables in your `.env` file.

### Steps:

1. Open your `.env` file
2. Add the following lines:
   ```
   ADMIN_EMAILS=your-admin-email@example.com
   ADMIN_PASSWORD=your-secure-admin-password
   ```
   
   For multiple admins, separate emails with commas:
   ```
   ADMIN_EMAILS=admin1@example.com,admin2@example.com
   ADMIN_PASSWORD=your-secure-admin-password
   ```

3. **Important**: 
   - The admin email must be registered as a regular user first
   - Use a strong, secure password for `ADMIN_PASSWORD`
   - Keep your `.env` file secure and never commit it to version control

4. Save the file and restart your server

### Admin Login Process:

1. Go to the regular login page (`/login`)
2. Click the "Admin Login" button
3. You will be redirected to the admin login page (`/admin/login`)
4. Enter your admin email (must be in ADMIN_EMAILS and registered as a user)
5. Enter the admin password (from ADMIN_PASSWORD)
6. Click "Admin Login"
7. You will be redirected to the admin dashboard (`/admin`)

**Note:** Admin login is completely separate from regular user login. It only requires admin email and admin password.

### Admin Features:

Once set up, admins will have access to:

- **Admin Dashboard** (`/admin`) - System overview with statistics
- **User Management** (`/admin/users`) - View, search, and delete users
- **All Transactions** (`/admin/transactions`) - View and manage all user transactions with filters
- **Statistics** (`/admin/stats`) - Detailed analytics and insights

### Admin Routes:

- `GET /admin` - Admin dashboard
- `GET /admin/users` - User management page
- `POST /admin/users/delete/:id` - Delete a user
- `GET /admin/transactions` - All transactions view
- `POST /admin/transactions/delete/:id` - Delete a transaction
- `GET /admin/stats` - Statistics and analytics

### Security:

- Only users with emails listed in `ADMIN_EMAILS` can access admin routes
- Admin routes are protected by the `requireAdmin` middleware
- Admins cannot delete their own accounts

