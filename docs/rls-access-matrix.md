# RLS Access Matrix

| Table Name          | Public (Anon) | Authenticated (Any)          | CUSTOMER Role                         | OWNER Role                                  | ADMIN Role                           |
| :------------------ | :------------ | :--------------------------- | :------------------------------------ | :------------------------------------------ | :----------------------------------- |
| `users`             | None          | SELECT (own profile)         | SELECT (own profile)                  | SELECT (own profile)                        | None (Bypassed via Service Role)     |
| `customer_profiles` | None          | SELECT, UPDATE (own profile) | SELECT, UPDATE (own profile)          | SELECT, UPDATE (own profile)                | None (Bypassed via Service Role)     |
| `owner_profiles`    | None          | SELECT, UPDATE (own profile) | SELECT, UPDATE (own profile)          | SELECT, UPDATE (own profile)                | None (Bypassed via Service Role)     |
| `venues`            | SELECT        | SELECT                       | SELECT                                | SELECT, INSERT, UPDATE, DELETE (own venues) | None (Bypassed via Service Role)     |
| `slots`             | SELECT        | SELECT                       | SELECT                                | SELECT, INSERT, UPDATE, DELETE (own slots)  | None (Bypassed via Service Role)     |
| `bookings`          | None          | None                         | SELECT, INSERT, UPDATE (own bookings) | SELECT, UPDATE (own venues' bookings)       | SELECT, INSERT, UPDATE, DELETE (All) |
| `cities`            | SELECT        | SELECT                       | SELECT                                | SELECT                                      | None (Bypassed via Service Role)     |
| `areas`             | SELECT        | SELECT                       | SELECT                                | SELECT                                      | None (Bypassed via Service Role)     |
| `venue_images`      | SELECT        | SELECT                       | SELECT                                | SELECT, INSERT, UPDATE, DELETE (own venues) | None (Bypassed via Service Role)     |
| `venue_pricing`     | SELECT        | SELECT                       | SELECT                                | SELECT, INSERT, UPDATE, DELETE (own venues) | None (Bypassed via Service Role)     |
| `owner_settings`    | None          | None                         | None                                  | SELECT, INSERT, UPDATE (own settings)       | None (Bypassed via Service Role)     |
| `admin_settings`    | SELECT        | SELECT                       | SELECT                                | SELECT                                      | SELECT, INSERT, UPDATE, DELETE (All) |
| `admin_audit_logs`  | None          | None                         | None                                  | None                                        | SELECT, INSERT, UPDATE, DELETE (All) |

_Note: For the tables marked as "None (Bypassed via Service Role)" under ADMIN, the current codebase performs all Admin-level queries for those tables using the `adminClient` (which uses the `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS completely)._
