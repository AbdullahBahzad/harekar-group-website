-- Email confirmation by code is now required before a new account can sign
-- in. Every account that already exists predates that rule, so it is
-- treated as confirmed — otherwise the people already using the site would
-- be locked out on the next deploy.
UPDATE "User" SET "emailVerified" = CURRENT_TIMESTAMP WHERE "emailVerified" IS NULL;
