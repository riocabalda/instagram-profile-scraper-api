# Database Seeders

This directory contains database seeder scripts to restore or populate data.

## Available Seeders

### `seedInputsFromProfiles.js`

Restores the `inputs` collection by extracting all unique usernames from the `profiles` collection.

**Purpose:** Fix the accidentally deleted inputs collection.

**Usage:**

```bash
npm run seed:inputs
```

**What it does:**

1. Connects to MongoDB
2. Fetches all unique usernames from the `profiles` collection
3. Inserts them into the `inputs` collection
4. Handles duplicates gracefully (skips existing entries)
5. Reports how many documents were inserted

**Output Example:**

```
✓ MongoDB connected
Starting seeder: seedInputsFromProfiles
---
Fetching all unique usernames from profiles collection...
✓ Found 150 profiles with 150 unique usernames
---
Inserting 150 usernames into inputs collection...
✓ Successfully inserted 150 documents
---
Seeding completed successfully!
✓ MongoDB connection closed
```

**Notes:**

- Make sure `.env` file is properly configured with `MONGO_URI` and `MONGO_DB_NAME`
- The seeder uses `insertMany` with `ordered: false` to handle duplicates gracefully
- Existing usernames in the `inputs` collection will not be overwritten
