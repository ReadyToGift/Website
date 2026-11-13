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
- [ ] Items
  - [ ] Create
  - [ ] Read
  - [ ] Update
  - [ ] Delete
  - [ ] Moving
  - [ ] Community Items
  - [ ] Fulfillment
  - [ ] Autofill
- [ ] Images / R2
  - [ ] Create
  - [x] Read (direct from R2 URL)
  - [ ] Metadata lookup
  - [ ] Delete
- [ ] Short URLs
  - [x] Lookup
  - [ ] Validation
- [ ] Auth
  - [ ] Account Creation
  - [ ] MFA
  - [ ] Verification
  - [ ] Account Settings
- [ ] User Preferences
  - [ ] Update
  - [ ] Read
- [ ] Billing
  - [ ] Move to user:{id} rather than appwrite:{id}
  - [ ] Update polar customers from Appwrite function
    - [ ] Creation
    - [ ] Deletion
    - [ ] Update (name, email etc)
  - [ ] Getting usage etc
  - [ ] Better-Auth Polar Integration
- [ ] Remove Appwrite references
