-- Platform internal roles + MEMBER org role (enum values only — PG requires commit before use)
ALTER TYPE "PlatformRole" ADD VALUE IF NOT EXISTS 'BUSINESS_ADMIN';
ALTER TYPE "PlatformRole" ADD VALUE IF NOT EXISTS 'DEMO_ADMIN';
ALTER TYPE "OrgRole" ADD VALUE IF NOT EXISTS 'MEMBER';
