# Smarterlift Database Schema

_Pulled live 2026-04-26 from hotel-leads-aurora cluster (PostgreSQL 16.8)._
_Modified 2026-04-27: dropped `activities`, `contacts`, `service_requests` (H-5 closure — dead tables, zero rows, zero code references; live counterparts `activity_log`, `prospect_contacts`, `service_tickets` already enforce `company_id`)._

Total tables: 37

## Multi-tenancy: tables with company_id (26):

- activity_log
- company_profile
- company_users
- completed_projects
- contracts
- customers
- documents
- elevator_intelligence
- elevators
- enrichment_log
- enrichment_monthly_summary
- invoices
- maintenance_logs
- maintenance_schedules
- notifications
- onboarding_steps
- proposals
- prospect_contacts
- prospect_notes
- prospects
- registry_requests
- service_tickets
- subscription_events
- technicians
- user_preferences
- users

## Tables WITHOUT company_id:

Each entry is annotated with whether the absence is intentional. After the H-5 cleanup, the only remaining tables without `company_id` are either global reference data, derived views, the root tenant table, or legacy/dead tables awaiting confirmation.

- building_registry — global reference data (TDLR Texas elevator registry, 74k rows); intentionally not tenant-scoped
- buildings — legacy; verify usage before next cleanup
- companies — root tenant table; intentional
- customer_elevator_summary — derived view
- elevator_contractors — global reference data (TDLR contractor registry); intentionally not tenant-scoped
- elevator_inspectors — global reference data (TDLR inspector registry); intentionally not tenant-scoped
- high_priority_leads — derived view
- hotel_contacts — legacy; verify usage before next cleanup
- hotels — legacy; verify usage before next cleanup
- lead_scores — derived view
- news_mentions — legacy / unused; verify before next cleanup

## Columns per table

### `activity_log` (8 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('activity_log_id_seq'::regclass) |
| company_id | integer | NO |  |
| user_email | character varying | YES |  |
| action | character varying | NO |  |
| resource_type | character varying | YES |  |
| resource_id | integer | YES |  |
| metadata | jsonb | YES |  |
| created_at | timestamp without time zone | YES | now() |

### `building_registry` (18 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('building_registry_id_seq'::regc |
| elevator_number | character varying | YES |  |
| building_name | character varying | YES |  |
| building_address | character varying | YES |  |
| building_city | character varying | YES |  |
| building_state | character varying | YES |  |
| building_zip | character varying | YES |  |
| building_county | character varying | YES |  |
| owner_name | character varying | YES |  |
| equipment_type | character varying | YES |  |
| drive_type | character varying | YES |  |
| floors | integer | YES |  |
| year_installed | integer | YES |  |
| most_recent_inspection | date | YES |  |
| expiration | date | YES |  |
| prospect_id | integer | YES |  |
| created_at | timestamp without time zone | YES | now() |
| source | character varying | NO | 'TDLR_TX'::character varying |

### `buildings` (18 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('buildings_id_seq'::regclass) |
| customer_id | integer | YES |  |
| name | character varying | NO |  |
| address | text | NO |  |
| city | character varying | YES |  |
| state | character varying | YES |  |
| zip_code | character varying | YES |  |
| coordinates | point | YES |  |
| floors | integer | YES |  |
| year_built | integer | YES |  |
| building_type | character varying | YES |  |
| property_manager | character varying | YES |  |
| manager_phone | character varying | YES |  |
| manager_email | character varying | YES |  |
| access_instructions | text | YES |  |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### `companies` (25 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('companies_id_seq'::regclass) |
| name | character varying | NO |  |
| slug | character varying | NO |  |
| plan_type | character varying | NO | 'standard'::character varying |
| features | jsonb | YES | '{"analytics": true, "ai_scheduling": tr |
| subscription_status | character varying | YES | 'active'::character varying |
| subscription_start_date | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| monthly_fee | numeric | YES |  |
| contact_email | character varying | YES |  |
| contact_phone | character varying | YES |  |
| address | text | YES |  |
| logo_url | text | YES |  |
| settings | jsonb | YES | '{}'::jsonb |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| stripe_customer_id | character varying | YES |  |
| stripe_subscription_id | character varying | YES |  |
| trial_ends_at | timestamp without time zone | YES |  |
| billing_cycle | character varying | YES | 'monthly'::character varying |
| max_users | integer | YES | 3 |
| max_prospects | integer | YES | 10000 |
| industry | character varying | YES | 'elevator'::character varying |
| state | character varying | YES |  |
| onboarding_completed | boolean | YES | false |
| referred_by | character varying | YES |  |

### `company_profile` (21 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('company_profile_id_seq'::regcla |
| company_name | character varying | YES |  |
| owner_name | character varying | YES |  |
| email | character varying | YES |  |
| phone | character varying | YES |  |
| website | character varying | YES |  |
| logo_url | character varying | YES |  |
| address | character varying | YES |  |
| city | character varying | YES |  |
| state | character varying | YES |  |
| tagline | character varying | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |
| bio | text | YES |  |
| years_in_business | integer | YES |  |
| service_area | character varying | YES |  |
| tdlr_license | character varying | YES |  |
| insurance_info | character varying | YES |  |
| certifications | text | YES |  |
| company_id | integer | YES | 1 |
| credentials | text | YES |  |

### `company_users` (10 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('company_users_id_seq'::regclass |
| company_id | integer | NO |  |
| cognito_sub | character varying | NO |  |
| email | character varying | NO |  |
| name | character varying | YES |  |
| role | character varying | YES | 'member'::character varying |
| status | character varying | YES | 'active'::character varying |
| last_login | timestamp without time zone | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### `completed_projects` (9 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('completed_projects_id_seq'::reg |
| building_name | character varying | YES |  |
| building_type | character varying | YES |  |
| city | character varying | YES |  |
| state | character varying | YES |  |
| scope | text | YES |  |
| year_completed | integer | YES |  |
| created_at | timestamp without time zone | YES | now() |
| company_id | integer | YES | 1 |

### `contracts` (16 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('contracts_id_seq'::regclass) |
| prospect_id | integer | YES |  |
| customer_id | integer | YES |  |
| company_name | character varying | YES |  |
| annual_value | numeric | YES |  |
| monthly_value | numeric | YES |  |
| start_date | date | YES |  |
| end_date | date | YES |  |
| term_months | integer | YES |  |
| elevators_under_contract | integer | YES |  |
| service_frequency | character varying | YES |  |
| contract_status | character varying | YES | 'active'::character varying |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |
| company_id | integer | YES | 1 |

### `customer_elevator_summary` (9 cols)

| col | type | null | default |
|---|---|---|---|
| customer_id | integer | YES |  |
| company_name | character varying | YES |  |
| elevator_id | integer | YES |  |
| elevator_identifier | character varying | YES |  |
| status | character varying | YES |  |
| install_date | date | YES |  |
| open_tickets | bigint | YES |  |
| last_service_date | date | YES |  |
| next_service_date | date | YES |  |

### `customers` (16 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('customers_id_seq'::regclass) |
| prospect_id | integer | YES |  |
| company_name | character varying | NO |  |
| address | text | YES |  |
| city | character varying | YES |  |
| state | character varying | YES |  |
| zip_code | character varying | YES |  |
| primary_contact_name | character varying | YES |  |
| primary_contact_email | character varying | YES |  |
| primary_contact_phone | character varying | YES |  |
| cognito_user_id | character varying | YES |  |
| account_status | character varying | YES | 'active'::character varying |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| archived | boolean | YES | false |
| company_id | integer | YES | 1 |

### `documents` (18 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('documents_id_seq'::regclass) |
| customer_id | integer | YES |  |
| elevator_id | integer | YES |  |
| document_type | character varying | YES |  |
| title | character varying | YES |  |
| file_url | character varying | YES |  |
| upload_date | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| expiration_date | date | YES |  |
| company_id | integer | YES | 1 |
| prospect_id | integer | YES |  |
| name | character varying | YES |  |
| category | character varying | YES | 'general'::character varying |
| file_size | integer | YES |  |
| mime_type | character varying | YES |  |
| notes | text | YES |  |
| created_by | character varying | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### `elevator_contractors` (21 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('elevator_contractors_id_seq'::r |
| license_number | character varying | YES |  |
| license_expiration | date | YES |  |
| county | character varying | YES |  |
| name | character varying | YES |  |
| business_name | character varying | YES |  |
| business_address | character varying | YES |  |
| business_city | character varying | YES |  |
| business_state | character varying | YES |  |
| business_zip | character varying | YES |  |
| business_county | character varying | YES |  |
| business_phone | character varying | YES |  |
| mailing_address | character varying | YES |  |
| mailing_city_state_zip | character varying | YES |  |
| phone | character varying | YES |  |
| license_subtype | character varying | YES |  |
| ce_flag | character varying | YES |  |
| smarterlift_status | character varying | YES | 'prospect'::character varying |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### `elevator_inspectors` (14 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('elevator_inspectors_id_seq'::re |
| license_number | character varying | YES |  |
| license_expiration | date | YES |  |
| county | character varying | YES |  |
| name | character varying | YES |  |
| business_name | character varying | YES |  |
| business_address | character varying | YES |  |
| business_county | character varying | YES |  |
| business_zip | character varying | YES |  |
| business_phone | character varying | YES |  |
| phone | character varying | YES |  |
| smarterlift_status | character varying | YES | 'prospect'::character varying |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | now() |

### `elevator_intelligence` (25 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('elevator_intelligence_id_seq':: |
| prospect_id | integer | YES |  |
| estimated_floors | integer | YES |  |
| estimated_elevators | integer | YES |  |
| building_age | integer | YES |  |
| elevator_mentions_count | integer | YES |  |
| negative_mentions | integer | YES |  |
| positive_mentions | integer | YES |  |
| reputation_score | numeric | YES |  |
| common_issues | jsonb | YES |  |
| service_urgency | character varying | YES |  |
| last_known_service_provider | character varying | YES |  |
| estimated_install_year | integer | YES |  |
| modernization_candidate | boolean | YES | false |
| analysis_date | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| sentiment_score | numeric | YES |  |
| ai_summary | text | YES |  |
| ai_recommendation | text | YES |  |
| ai_scored_at | timestamp without time zone | YES |  |
| company_id | integer | YES | 1 |
| review_intelligence | jsonb | YES |  |
| elevator_complaints | integer | YES | 0 |
| competitor_mentions | ARRAY | YES |  |
| maintenance_signals | ARRAY | YES |  |

### `elevators` (21 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('elevators_id_seq'::regclass) |
| customer_id | integer | YES |  |
| elevator_identifier | character varying | YES |  |
| manufacturer | character varying | YES |  |
| model | character varying | YES |  |
| serial_number | character varying | YES |  |
| install_date | date | YES |  |
| last_modernization_date | date | YES |  |
| capacity_lbs | integer | YES |  |
| floors_served | integer | YES |  |
| status | character varying | YES | 'operational'::character varying |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| company_id | integer | YES | 1 |
| last_inspection_date | date | YES |  |
| next_inspection_date | date | YES |  |
| tdlr_certificate_number | character varying | YES |  |
| risk_score | integer | YES | 0 |
| modernization_needed | boolean | YES | false |
| parts_history | jsonb | YES |  |

### `enrichment_log` (8 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('enrichment_log_id_seq'::regclas |
| company_id | integer | NO |  |
| prospect_id | integer | YES |  |
| service | character varying | NO |  |
| status | character varying | NO |  |
| credits_used | numeric | YES | 1 |
| response_data | jsonb | YES |  |
| called_at | timestamp without time zone | YES | now() |

### `enrichment_monthly_summary` (9 cols)

| col | type | null | default |
|---|---|---|---|
| company_id | integer | YES |  |
| service | character varying | YES |  |
| month | timestamp without time zone | YES |  |
| api_calls_made | bigint | YES |  |
| cache_hits | bigint | YES |  |
| misses | bigint | YES |  |
| errors | bigint | YES |  |
| total_credits_used | numeric | YES |  |
| cache_hit_rate_pct | numeric | YES |  |

### `high_priority_leads` (11 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | YES |  |
| name | character varying | YES |  |
| city | character varying | YES |  |
| state | character varying | YES |  |
| lead_score | integer | YES |  |
| service_urgency | character varying | YES |  |
| common_issues | jsonb | YES |  |
| reputation_score | numeric | YES |  |
| phone | character varying | YES |  |
| website | character varying | YES |  |
| status | character varying | YES |  |

### `hotel_contacts` (10 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('hotel_contacts_id_seq'::regclas |
| hotel_id | integer | YES |  |
| name | character varying | YES |  |
| title | character varying | YES |  |
| email | character varying | YES |  |
| phone | character varying | YES |  |
| linkedin_url | character varying | YES |  |
| contact_type | character varying | YES |  |
| is_primary | boolean | YES | false |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### `hotels` (18 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('hotels_id_seq'::regclass) |
| name | character varying | NO |  |
| address | text | YES |  |
| city | character varying | YES |  |
| state | character varying | YES | 'TX'::character varying |
| zip_code | character varying | YES |  |
| phone | character varying | YES |  |
| email | character varying | YES |  |
| website | character varying | YES |  |
| google_place_id | character varying | YES |  |
| rating | numeric | YES |  |
| total_rooms | integer | YES |  |
| property_type | character varying | YES |  |
| chain_affiliation | character varying | YES |  |
| business_status | character varying | YES |  |
| price_level | integer | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### `invoices` (18 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('invoices_id_seq'::regclass) |
| customer_id | integer | YES |  |
| service_ticket_id | integer | YES |  |
| invoice_number | character varying | YES |  |
| amount | numeric | YES |  |
| tax | numeric | YES |  |
| total | numeric | YES |  |
| status | character varying | YES | 'pending'::character varying |
| due_date | date | YES |  |
| paid_date | date | YES |  |
| payment_method | character varying | YES |  |
| pdf_url | character varying | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| company_id | integer | YES | 1 |
| line_items | jsonb | YES |  |
| notes | text | YES |  |
| sent_at | timestamp without time zone | YES |  |

### `lead_scores` (9 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('lead_scores_id_seq'::regclass) |
| hotel_id | integer | YES |  |
| ai_score | numeric | YES |  |
| priority_level | character varying | YES |  |
| score_factors | jsonb | YES |  |
| elevator_potential_rating | integer | YES |  |
| recommended_approach | text | YES |  |
| next_action | character varying | YES |  |
| last_calculated | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### `maintenance_logs` (12 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('maintenance_logs_id_seq'::regcl |
| elevator_id | integer | YES |  |
| service_ticket_id | integer | YES |  |
| service_type | character varying | YES |  |
| technician_name | character varying | YES |  |
| service_date | date | YES |  |
| work_performed | text | YES |  |
| parts_replaced | jsonb | YES |  |
| next_service_date | date | YES |  |
| cost | numeric | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| company_id | integer | YES | 1 |

### `maintenance_schedules` (13 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('maintenance_schedules_id_seq':: |
| company_id | integer | NO |  |
| customer_id | integer | YES |  |
| elevator_id | integer | YES |  |
| schedule_type | character varying | NO |  |
| frequency | character varying | NO |  |
| last_service_date | date | YES |  |
| next_due_date | date | YES |  |
| assigned_technician_id | integer | YES |  |
| notes | text | YES |  |
| status | character varying | YES | 'active'::character varying |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### `news_mentions` (9 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('news_mentions_id_seq'::regclass |
| prospect_id | integer | YES |  |
| title | character varying | YES |  |
| source | character varying | YES |  |
| url | text | YES |  |
| publish_date | date | YES |  |
| snippet | text | YES |  |
| relevance_score | numeric | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

### `notifications` (8 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('notifications_id_seq'::regclass |
| company_id | integer | NO |  |
| type | character varying | NO |  |
| title | character varying | NO |  |
| message | text | YES |  |
| link | character varying | YES |  |
| read | boolean | YES | false |
| created_at | timestamp without time zone | YES | now() |

### `onboarding_steps` (6 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('onboarding_steps_id_seq'::regcl |
| company_id | integer | NO |  |
| step | character varying | NO |  |
| completed | boolean | YES | false |
| completed_at | timestamp without time zone | YES |  |
| created_at | timestamp without time zone | YES | now() |

### `proposals` (5 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('proposals_id_seq'::regclass) |
| prospect_id | integer | YES |  |
| content | text | YES |  |
| generated_at | timestamp without time zone | YES | now() |
| company_id | integer | YES | 1 |

### `prospect_contacts` (13 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('prospect_contacts_id_seq'::regc |
| prospect_id | integer | YES |  |
| first_name | character varying | YES |  |
| last_name | character varying | YES |  |
| email | character varying | YES |  |
| title | character varying | YES |  |
| linkedin_url | character varying | YES |  |
| confidence | integer | YES |  |
| source | character varying | YES | 'hunter'::character varying |
| created_at | timestamp without time zone | YES | now() |
| phone | character varying | YES |  |
| company_id | integer | YES | 1 |
| is_primary | boolean | YES | false |

### `prospect_notes` (7 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('prospect_notes_id_seq'::regclas |
| prospect_id | integer | YES |  |
| content | text | NO |  |
| created_by | character varying | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |
| company_id | integer | YES | 1 |

### `prospects` (23 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('prospects_id_seq'::regclass) |
| name | character varying | NO |  |
| type | character varying | YES |  |
| address | text | YES |  |
| city | character varying | YES |  |
| state | character varying | YES |  |
| zip_code | character varying | YES |  |
| latitude | numeric | YES |  |
| longitude | numeric | YES |  |
| google_place_id | character varying | YES |  |
| phone | character varying | YES |  |
| website | character varying | YES |  |
| rating | numeric | YES |  |
| total_reviews | integer | YES |  |
| status | character varying | YES | 'new'::character varying |
| lead_score | integer | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| notes | text | YES |  |
| archived | boolean | YES | false |
| company_id | integer | YES | 1 |
| enrichment_source | character varying | YES |  |
| owner_name | character varying | YES |  |

### `registry_requests` (8 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('registry_requests_id_seq'::regc |
| company_id | integer | YES |  |
| state | character varying | NO |  |
| city | character varying | YES |  |
| requested_by_email | character varying | YES |  |
| notes | text | YES |  |
| status | character varying | YES | 'pending'::character varying |
| created_at | timestamp without time zone | NO | now() |

### `service_tickets` (17 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('service_tickets_id_seq'::regcla |
| customer_id | integer | YES |  |
| elevator_id | integer | YES |  |
| ticket_number | character varying | YES |  |
| title | character varying | YES |  |
| description | text | YES |  |
| priority | character varying | YES |  |
| status | character varying | YES | 'open'::character varying |
| reported_by | character varying | YES |  |
| assigned_technician | character varying | YES |  |
| scheduled_date | timestamp without time zone | YES |  |
| completed_date | timestamp without time zone | YES |  |
| resolution_notes | text | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| company_id | integer | YES | 1 |
| assigned_technician_id | integer | YES |  |

### `subscription_events` (7 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('subscription_events_id_seq'::re |
| company_id | integer | NO |  |
| event_type | character varying | NO |  |
| amount | numeric | YES |  |
| stripe_event_id | character varying | YES |  |
| status | character varying | YES |  |
| created_at | timestamp without time zone | YES | now() |

### `technicians` (13 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('technicians_id_seq'::regclass) |
| company_id | integer | NO |  |
| name | character varying | NO |  |
| email | character varying | YES |  |
| phone | character varying | YES |  |
| tdlr_license_number | character varying | YES |  |
| certifications | ARRAY | YES |  |
| specializations | ARRAY | YES |  |
| status | character varying | YES | 'active'::character varying |
| hire_date | date | YES |  |
| notes | text | YES |  |
| created_at | timestamp without time zone | YES | now() |
| updated_at | timestamp without time zone | YES | now() |

### `user_preferences` (8 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('user_preferences_id_seq'::regcl |
| company_id | integer | NO |  |
| cognito_sub | character varying | NO |  |
| email | character varying | YES |  |
| display_name | character varying | YES |  |
| preferences | jsonb | YES | '{}'::jsonb |
| last_active | timestamp without time zone | YES | now() |
| created_at | timestamp without time zone | YES | now() |

### `users` (15 cols)

| col | type | null | default |
|---|---|---|---|
| id | integer | NO | nextval('users_id_seq'::regclass) |
| company_id | integer | YES |  |
| email | character varying | NO |  |
| password_hash | character varying | YES |  |
| cognito_sub | character varying | YES |  |
| first_name | character varying | YES |  |
| last_name | character varying | YES |  |
| phone | character varying | YES |  |
| role | character varying | NO |  |
| permissions | jsonb | YES | '{}'::jsonb |
| is_active | boolean | YES | true |
| last_login | timestamp without time zone | YES |  |
| avatar_url | text | YES |  |
| created_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | YES | CURRENT_TIMESTAMP |

## Row counts (per table)

- activity_log: 107
- building_registry: 74001
- buildings: 0
- companies: 1
- company_profile: 1
- company_users: 1
- completed_projects: 0
- contracts: 0
- customer_elevator_summary: 2
- customers: 1
- documents: 0
- elevator_contractors: 365
- elevator_inspectors: 207
- elevator_intelligence: 8
- elevators: 2
- enrichment_log: 36
- enrichment_monthly_summary: 2
- high_priority_leads: 8
- hotel_contacts: 0
- hotels: 20
- invoices: 0
- lead_scores: 20
- maintenance_logs: 1
- maintenance_schedules: 0
- news_mentions: 0
- notifications: 0
- onboarding_steps: 0
- proposals: 1
- prospect_contacts: 37
- prospect_notes: 1
- prospects: 8
- registry_requests: 1
- service_tickets: 1
- subscription_events: 0
- technicians: 1
- user_preferences: 1
- users: 1

