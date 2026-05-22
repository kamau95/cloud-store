-- Remove passwordHash and tokenVersion from User (now managed by Supabase Auth)
ALTER TABLE "User" DROP COLUMN "passwordHash";
ALTER TABLE "User" DROP COLUMN "tokenVersion";

-- Drop session and password reset tables (managed by Supabase Auth)
DROP TABLE "user_sessions";
DROP TABLE "password_reset_tokens";
DROP TABLE "user_session_store";
