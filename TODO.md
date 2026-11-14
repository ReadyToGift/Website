# TODO

## Migration from appwrite -> drizzle + better-auth

### Topology

- Appwrite Database -> Drizzle with Cloudflare D1
- Appwrite Auth -> Better-Auth
- Appwrite Storage -> Cloudflare R2
- Appwrite Functions -> Astro Functions/Cloudflare Workers

### TODO

- [x] Lists
  - [x] Create
  - [x] Read
  - [x] Update
  - [x] Delete
- [x] Items
  - [x] Create
  - [x] Read
  - [x] Update
  - [x] Delete
  - [x] Moving
  - [x] Community Items
  - [x] Fulfillment
  - [x] Autofill
- [x] Images / R2
  - [x] Create (through the item endpoint)
  - [x] Read (direct from R2 URL)
  - [x] Metadata lookup
  - [x] Delete (through the item endpoint)
- [x] Short URLs
  - [x] Lookup
  - [x] Validation
- [x] Auth
  - [x] Account Creation
  - [x] MFA
  - [x] Verification
  - [x] Account Settings
- [x] User Preferences
  - [x] Update
  - [x] Read
- [ ] Billing
  - [x] Move to user:{id} rather than appwrite:{id}
  - [x] Update Polar customers from Better Auth users
    - [ ] Creation
    - [ ] Deletion
    - [ ] Update (name, email etc)
  - [ ] Getting usage etc
  - [ ] Better-Auth Polar Integration
- [ ] Remove Appwrite references
