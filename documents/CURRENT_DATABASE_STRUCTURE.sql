-- ============================================================================
-- CURRENT DATABASE STRUCTURE - EXPORT SNAPSHOT
-- ============================================================================
-- Date: November 1, 2025 (Updated with join requests feature)
-- Database: NFC Attendance System
-- This file contains the complete current state of the database
-- Status: ✅ ACTIVE - Join Request System Implemented
-- ============================================================================

-- ============================================================================
-- TABLES OVERVIEW
-- ============================================================================
-- Base Tables: 5
-- Views: 2
-- Total Tables: 7

/*
TABLE NAME                    | TYPE
------------------------------|------------
events                        | BASE TABLE
organization_join_requests    | BASE TABLE
membership_with_organization  | VIEW
membership_with_user          | VIEW
organization_members          | BASE TABLE
organizations                 | BASE TABLE
users                         | BASE TABLE
*/

-- ============================================================================
-- COMPLETE TABLE STRUCTURES WITH COLUMNS
-- ============================================================================

-- TABLE: events
-- Description: Stores event information for organizations
-- Rows: 0
/*
COLUMN NAME      | DATA TYPE               | NULLABLE | DEFAULT          | POSITION
-----------------|-------------------------|----------|------------------|----------
id               | uuid                    | NO       | gen_random_uuid()| 1
event_name       | text                    | NO       | null             | 2
date             | timestamp with timezone | NO       | null             | 3
organization_id  | uuid                    | NO       | null             | 4
description      | text                    | YES      | null             | 5
location         | text                    | YES      | null             | 6
created_by       | uuid                    | NO       | null             | 7
created_at       | timestamp with timezone | NO       | now()            | 8
updated_at       | timestamp with timezone | NO       | now()            | 9
*/

-- TABLE: organization_join_requests
-- Description: Manages user requests to join organizations
-- Rows: 0
/*
COLUMN NAME      | DATA TYPE               | NULLABLE | DEFAULT          | POSITION
-----------------|-------------------------|----------|------------------|----------
id               | uuid                    | NO       | gen_random_uuid()| 1
organization_id  | uuid                    | NO       | null             | 2
user_id          | uuid                    | NO       | null             | 3
status           | text                    | NO       | 'pending'        | 4
requested_at     | timestamp with timezone | NO       | now()            | 5
reviewed_at      | timestamp with timezone | YES      | null             | 6
reviewed_by      | uuid                    | YES      | null             | 7
created_at       | timestamp with timezone | NO       | now()            | 8
updated_at       | timestamp with timezone | NO       | now()            | 9
*/

-- TABLE: organization_members
-- Description: Junction table for user-organization relationships with roles
-- Rows: 3
/*
COLUMN NAME      | DATA TYPE               | NULLABLE | DEFAULT          | POSITION
-----------------|-------------------------|----------|------------------|----------
id               | uuid                    | NO       | gen_random_uuid()| 1
organization_id  | uuid                    | NO       | null             | 2
user_id          | uuid                    | NO       | null             | 3
role             | text                    | NO       | null             | 4
joined_at        | timestamp with timezone | NO       | now()            | 5
updated_at       | timestamp with timezone | NO       | now()            | 6
*/

-- TABLE: organizations
-- Description: Stores organization information
-- Rows: 3
/*
COLUMN NAME      | DATA TYPE               | NULLABLE | DEFAULT          | POSITION
-----------------|-------------------------|----------|------------------|----------
id               | uuid                    | NO       | gen_random_uuid()| 1
name             | text                    | NO       | null             | 2
description      | text                    | YES      | null             | 3
owner_user_id    | uuid                    | NO       | null             | 4
created_at       | timestamp with timezone | NO       | now()            | 5
updated_at       | timestamp with timezone | NO       | now()            | 6
tag              | text                    | YES      | null             | 7
*/

-- TABLE: users
-- Description: User profiles and authentication information
-- Rows: 3
/*
COLUMN NAME              | DATA TYPE               | NULLABLE | DEFAULT          | POSITION
-------------------------|-------------------------|----------|------------------|----------
id                       | uuid                    | NO       | null             | 2
name                     | text                    | NO       | null             | 3
email                    | text                    | NO       | null             | 4
user_type                | text                    | NO       | null             | 5
nfc_tag_id               | text                    | YES      | null             | 6
qr_code_data             | text                    | YES      | null             | 7
created_at               | timestamp with timezone | YES      | now()            | 8
updated_at               | timestamp with timezone | YES      | now()            | 9
auth_provider            | text                    | NO       | 'email'          | 10
has_password             | boolean                 | NO       | false            | 11
*/

-- ============================================================================
-- FOREIGN KEY RELATIONSHIPS
-- ============================================================================

/*
FROM TABLE                | FROM COLUMN     | TO TABLE      | TO COLUMN | CONSTRAINT NAME      | UPDATE RULE | DELETE RULE
--------------------------|-----------------|---------------|-----------|----------------------|-------------|-------------
events                    | created_by      | users         | id        | fk_created_by_user   | NO ACTION   | CASCADE
events                    | organization_id | organizations | id        | fk_organization      | NO ACTION   | CASCADE
organization_join_requests| organization_id | organizations | id        | fk_organization      | NO ACTION   | CASCADE
organization_join_requests| reviewed_by     | users         | id        | fk_reviewed_by_user  | NO ACTION   | SET NULL
organization_join_requests| user_id         | users         | id        | fk_user              | NO ACTION   | CASCADE
organization_members      | organization_id | organizations | id        | fk_organization      | NO ACTION   | CASCADE
organization_members      | user_id         | users         | id        | fk_user              | NO ACTION   | CASCADE
organizations             | owner_user_id   | users         | id        | fk_owner_user        | NO ACTION   | NO ACTION
*/

-- ============================================================================
-- UNIQUE CONSTRAINTS & PRIMARY KEYS
-- ============================================================================

/*
TABLE NAME                | CONSTRAINT NAME              | TYPE        | COLUMNS
--------------------------|------------------------------|-------------|-------------------------
events                    | events_pkey                  | PRIMARY KEY | id
organization_join_requests| organization_join_requests_pkey| PRIMARY KEY| id
organization_join_requests| unique_pending_request       | UNIQUE      | organization_id, user_id
organization_members      | organization_members_pkey    | PRIMARY KEY | id
organization_members      | unique_org_user              | UNIQUE      | organization_id, user_id
organizations             | organizations_pkey           | PRIMARY KEY | id
organizations             | unique_organization_tag      | UNIQUE      | tag
users                     | users_pkey                   | PRIMARY KEY | id
users                     | users_email_key              | UNIQUE      | email
users                     | users_nfc_tag_id_key         | UNIQUE      | nfc_tag_id
users                     | users_qr_code_data_key       | UNIQUE      | qr_code_data
*/

-- ============================================================================
-- CHECK CONSTRAINTS (Validation Rules)
-- ============================================================================

/*
TABLE NAME                | CONSTRAINT NAME                       | CHECK CLAUSE
--------------------------|---------------------------------------|--------------------------------------------------
events                    | Multiple NOT NULL constraints         | Various columns must not be null
organization_join_requests| Multiple NOT NULL constraints         | Various columns must not be null
organization_join_requests| organization_join_requests_status_check| status IN ('pending', 'approved', 'rejected')
organization_members      | Multiple NOT NULL constraints         | Various columns must not be null
organization_members      | organization_members_role_check       | role IN ('Owner', 'Admin', 'Attendance Taker', 'Member')
organizations             | Multiple NOT NULL constraints         | Various columns must not be null
users                     | Multiple NOT NULL constraints         | Various columns must not be null
users                     | users_auth_provider_check             | auth_provider IN ('email', 'google', 'github', 'azure', 'facebook')
users                     | users_user_type_check                 | user_type IN ('Student', 'Faculty')
*/

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

/*
TABLE NAME                | INDEX NAME                              | INDEX DEFINITION
--------------------------|-----------------------------------------|--------------------------------------------------------
events                    | events_pkey                             | UNIQUE on id
events                    | idx_events_created_at                   | created_at DESC
events                    | idx_events_created_by                   | created_by
events                    | idx_events_date                         | date DESC
events                    | idx_events_name                         | event_name
events                    | idx_events_org_date                     | organization_id, date DESC
events                    | idx_events_organization_id              | organization_id

organization_join_requests| organization_join_requests_pkey         | UNIQUE on id
organization_join_requests| unique_pending_request                  | UNIQUE on organization_id, user_id
organization_join_requests| idx_join_requests_org_id                | organization_id
organization_join_requests| idx_join_requests_org_status            | organization_id, status
organization_join_requests| idx_join_requests_status                | status
organization_join_requests| idx_join_requests_user_id               | user_id

organization_members      | organization_members_pkey               | UNIQUE on id
organization_members      | unique_org_user                         | UNIQUE on organization_id, user_id
organization_members      | idx_organization_members_joined_at      | joined_at DESC
organization_members      | idx_organization_members_org_role       | organization_id, role
organization_members      | idx_organization_members_organization_id| organization_id
organization_members      | idx_organization_members_role           | role
organization_members      | idx_organization_members_user_id        | user_id
organization_members      | idx_organization_members_user_org       | user_id, organization_id

organizations             | organizations_pkey                      | UNIQUE on id
organizations             | unique_organization_tag                 | UNIQUE on tag
organizations             | idx_organizations_created_at            | created_at DESC
organizations             | idx_organizations_name                  | name
organizations             | idx_organizations_owner                 | owner_user_id
organizations             | idx_organizations_tag                   | tag

users                     | users_pkey                              | UNIQUE on id
users                     | users_email_key                         | UNIQUE on email
users                     | users_nfc_tag_id_key                    | UNIQUE on nfc_tag_id
users                     | users_qr_code_data_key                  | UNIQUE on qr_code_data
users                     | idx_users_email                         | email
users                     | idx_users_nfc_tag_id                    | nfc_tag_id
users                     | idx_users_user_type                     | user_type
*/

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) STATUS
-- ============================================================================

/*
TABLE NAME                | RLS ENABLED
--------------------------|-------------
events                    | TRUE
organization_join_requests| TRUE
organization_members      | TRUE
organizations             | TRUE
users                     | TRUE
*/

-- ============================================================================
-- RLS POLICIES (Security Rules) - UPDATED
-- ============================================================================
-- Total Policies: 23
-- Status: ✅ Active with Join Request System

-- EVENTS TABLE POLICIES (6 policies)
/*
POLICY NAME                                      | OPERATION | DESCRIPTION
-------------------------------------------------|-----------|--------------------------------------------------------
Admins and Attendance Takers can create events   | INSERT    | Admins/Attendance Takers can create events
Members can view organization events             | SELECT    | Members can view events in their organizations
creators_and_admins_can_delete_events            | DELETE    | Event creators and admins can delete events
creators_and_admins_can_update_events            | UPDATE    | Event creators and admins can update events
members_can_create_events                        | INSERT    | Organization members can create events (function-based)
members_can_view_events                          | SELECT    | Members can view events (function-based)
*/

-- ORGANIZATION_JOIN_REQUESTS TABLE POLICIES (5 policies)
/*
POLICY NAME                                      | OPERATION | DESCRIPTION
-------------------------------------------------|-----------|--------------------------------------------------------
admins_can_update_requests                       | UPDATE    | Admins can approve/reject join requests
admins_can_view_org_requests                     | SELECT    | Admins can view org join requests
users_can_create_join_requests                   | INSERT    | Users can create join requests
users_can_delete_own_pending_requests            | DELETE    | Users can delete their own pending requests
users_can_view_own_requests                      | SELECT    | Users can view their own requests
*/

-- ORGANIZATION_MEMBERS TABLE POLICIES (4 policies)
/*
POLICY NAME                                      | OPERATION | DESCRIPTION
-------------------------------------------------|-----------|--------------------------------------------------------
delete_members                                   | DELETE    | Users can leave orgs, owners can remove members
insert_members_by_owner_or_admin                 | INSERT    | Owners/Admins can add members
select_own_memberships                           | SELECT    | Users can view their own memberships
update_members_by_owner                          | UPDATE    | Owners can update member roles
*/

-- ORGANIZATIONS TABLE POLICIES (4 policies)
/*
POLICY NAME                                      | OPERATION | DESCRIPTION
-------------------------------------------------|-----------|--------------------------------------------------------
Authenticated users can create organizations     | INSERT    | Any authenticated user can create an organization
Owners can delete their organizations            | DELETE    | Owners can delete their organizations
Owners and Admins can update organizations       | UPDATE    | Owners/Admins can update organization info
users_can_view_organizations                     | SELECT    | Users can view organizations they are members of
*/

-- USERS TABLE POLICIES (4 policies)
/*
POLICY NAME                    | OPERATION | DESCRIPTION
-------------------------------|-----------|--------------------------------------------------------
users_can_insert_own_profile   | INSERT    | Users can create their own profile
users_can_view_own_profile     | SELECT    | Users can view their own profile
users_can_update_own_profile   | UPDATE    | Users can update their own profile
users_can_delete_own_profile   | DELETE    | Users can delete their own profile
*/

-- ============================================================================
-- TRIGGERS (Auto-Update Mechanisms)
-- ============================================================================

/*
TRIGGER NAME                         | EVENT  | TABLE NAME                | ACTION                       | TIMING
-------------------------------------|--------|---------------------------|------------------------------|--------
update_events_updated_at             | UPDATE | events                    | update_updated_at_column()   | BEFORE
update_join_requests_updated_at      | UPDATE | organization_join_requests| update_updated_at_column()   | BEFORE
enforce_single_owner                 | INSERT | organization_members      | check_single_owner()         | BEFORE
enforce_single_owner                 | UPDATE | organization_members      | check_single_owner()         | BEFORE
update_organization_members_updated_at| UPDATE| organization_members      | update_updated_at_column()   | BEFORE
update_organizations_updated_at      | UPDATE | organizations             | update_updated_at_column()   | BEFORE
update_users_updated_at              | UPDATE | users                     | update_updated_at_column()   | BEFORE
*/

-- ============================================================================
-- DATABASE FUNCTIONS
-- ============================================================================

/*
FUNCTION NAME                       | RETURN TYPE | ARGUMENTS                               | TYPE
------------------------------------|-------------|-----------------------------------------|----------
approve_join_request                | boolean     | p_request_id uuid, p_reviewer_id uuid   | function
check_single_owner                  | trigger     | (none)                                  | function
get_organization_member_count       | integer     | p_organization_id uuid                  | function
get_user_membership_count           | integer     | p_user_id uuid                          | function
get_user_role_in_organization       | text        | p_user_id uuid, p_organization_id uuid  | function
is_org_admin                        | boolean     | org_id uuid, user_auth_id uuid          | function
is_org_member                       | boolean     | org_id uuid, user_auth_id uuid          | function
is_org_owner                        | boolean     | org_id uuid, user_auth_id uuid          | function
mark_user_password_set              | trigger     | (none)                                  | function
update_updated_at_column            | trigger     | (none)                                  | function
user_can_reset_password             | boolean     | user_email text                         | function
user_has_permission                 | boolean     | p_user_id uuid, p_organization_id uuid, p_required_role text | function
user_has_role                       | boolean     | p_user_id uuid, p_organization_id uuid, p_role text | function
*/

-- ============================================================================
-- TABLE ROW COUNTS & DATA STATUS
-- ============================================================================

/*
TABLE NAME                | ROW COUNT | STATUS
--------------------------|-----------|------------------
users                     | 3         | Active users
organizations             | 3         | Active organizations
organization_members      | 3         | Active memberships
organization_join_requests| 0         | Empty - Ready
events                    | 0         | Empty - Ready
*/

-- ============================================================================
-- TABLE SIZES (Disk Space Usage)
-- ============================================================================
-- Note: Sizes are approximate and will grow with data

/*
TABLE NAME                | TOTAL SIZE | TABLE SIZE | INDEXES SIZE
--------------------------|------------|------------|-------------
users                     | ~200 kB    | ~10 kB     | ~190 kB
organizations             | ~150 kB    | ~10 kB     | ~140 kB
organization_members      | ~120 kB    | ~5 kB      | ~115 kB
organization_join_requests| ~80 kB     | 0 bytes    | ~80 kB
events                    | ~70 kB     | 0 bytes    | ~70 kB

TOTAL DATABASE SIZE  | 12 MB
*/

-- ============================================================================
-- ENUM TYPES
-- ============================================================================
-- No custom ENUM types defined
-- Using TEXT fields with CHECK constraints instead:
--   - users.user_type: 'Student', 'Faculty'
--   - users.auth_provider: 'email', 'google', 'github', 'azure', 'facebook'
--   - organization_members.role: 'Owner', 'Admin', 'Attendance Taker', 'Member'
--   - organization_join_requests.status: 'pending', 'approved', 'rejected'

-- ============================================================================
-- DATABASE RELATIONSHIPS DIAGRAM
-- ============================================================================
/*
users (3 rows) ✅
  ├─ id (PK)
  ├─ email (UNIQUE)
  ├─ nfc_tag_id (UNIQUE)
  ├─ qr_code_data (UNIQUE)
  ├─ auth_provider (email/google/github/azure/facebook)
  └─ has_password (boolean)
      │
      ├─ FK → organizations.owner_user_id (1 user can own many orgs)
      ├─ FK → organization_members.user_id (1 user can be in many orgs)
      ├─ FK → organization_join_requests.user_id (1 user can request many orgs)
      ├─ FK → organization_join_requests.reviewed_by (1 user can review many requests)
      └─ FK → events.created_by (1 user can create many events)

organizations (3 rows) ✅
  ├─ id (PK)
  ├─ name
  ├─ description
  ├─ tag (UNIQUE) - Organization identifier
  └─ owner_user_id → users.id
      │
      ├─ FK → organization_members.organization_id (1 org has many members)
      ├─ FK → organization_join_requests.organization_id (1 org has many requests)
      └─ FK → events.organization_id (1 org has many events)

organization_members (3 rows) ✅
  ├─ id (PK)
  ├─ organization_id → organizations.id
  ├─ user_id → users.id
  ├─ role (CHECK: Owner, Admin, Attendance Taker, Member)
  └─ UNIQUE(organization_id, user_id)

organization_join_requests (0 rows) ✅ NEW TABLE
  ├─ id (PK)
  ├─ organization_id → organizations.id
  ├─ user_id → users.id
  ├─ status (CHECK: pending, approved, rejected)
  ├─ requested_at
  ├─ reviewed_at
  ├─ reviewed_by → users.id (nullable)
  └─ UNIQUE(organization_id, user_id) - One pending request per user per org

events (0 rows)
  ├─ id (PK)
  ├─ event_name
  ├─ date
  ├─ organization_id → organizations.id
  ├─ description
  ├─ location
  └─ created_by → users.id
*/

-- ============================================================================
-- VIEWS (Helper Queries)
-- ============================================================================

-- VIEW: membership_with_organization
-- Purpose: Joins organization_members with organizations for easy querying
/*
DEFINITION:
SELECT om.id,
    om.organization_id,
    om.user_id,
    om.role,
    om.joined_at,
    om.updated_at,
    o.name AS organization_name,
    o.description AS organization_description,
    o.owner_user_id AS organization_owner_id
FROM (organization_members om
    JOIN organizations o ON ((om.organization_id = o.id)));
*/

-- VIEW: membership_with_user
-- Purpose: Joins organization_members with users for easy querying
/*
DEFINITION:
SELECT om.id,
    om.organization_id,
    om.user_id,
    om.role,
    om.joined_at,
    om.updated_at,
    u.name AS user_name,
    u.email AS user_email,
    u.user_type,
    u.auth_provider,
    u.has_password
FROM (organization_members om
    JOIN users u ON ((om.user_id = u.id)));
*/

-- ============================================================================
-- SUMMARY
-- ============================================================================
/*
✅ DATABASE IS FULLY OPERATIONAL WITH JOIN REQUEST SYSTEM

Status Summary:
- All required tables exist and populated with test data
- All foreign keys configured correctly
- RLS policies active and secure (23 policies)
- Indexes optimized for performance
- Helper functions available
- Auto-update triggers working
- Join request workflow implemented

Recent Updates (November 1, 2025):
✅ Added organization_join_requests table
✅ Added organization tag system (unique identifier)
✅ Added user authentication provider tracking
✅ Added password management system
✅ New functions: approve_join_request, user_can_reset_password, mark_user_password_set
✅ Updated user_type constraints (removed 'Admin', now only 'Student', 'Faculty')
✅ Database now contains 3 users, 3 organizations, 3 memberships

Current Data:
- 3 active users (up from 1)
- 3 active organizations (up from 0)
- 3 active memberships (up from 0)
- Join request system ready for use
- Event system ready for use

Table Summary (5 base tables, 2 views):
1. users - User profiles with auth provider tracking
2. organizations - Organization management with tags
3. organization_members - Membership management
4. organization_join_requests - Join request workflow (NEW)
5. events - Event management
6. membership_with_organization (VIEW)
7. membership_with_user (VIEW)

Policy Summary (23 total):
- events: 6 policies
- organization_join_requests: 5 policies (NEW)
- organization_members: 4 policies
- organizations: 4 policies
- users: 4 policies

Function Summary (13 total):
- approve_join_request (NEW)
- mark_user_password_set (NEW)
- user_can_reset_password (NEW)
- check_single_owner
- get_organization_member_count
- get_user_membership_count
- get_user_role_in_organization
- is_org_admin
- is_org_member
- is_org_owner
- update_updated_at_column
- user_has_permission
- user_has_role

Performance Metrics:
- Total database size: 12 MB
- All tables properly indexed
- RLS enabled on all tables
- Optimized for read-heavy workloads

Next Steps:
1. ✅ Continue testing join request workflow
2. ✅ Test organization search by tag
3. ✅ Create events for organizations
4. ✅ Monitor database performance
5. ✅ Test authentication providers

Last Updated: November 1, 2025
Updated By: Database Structure Export
*/
