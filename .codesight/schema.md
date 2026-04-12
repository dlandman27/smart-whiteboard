# Schema

### boards
- id: uuid (pk)
- user_id: uuid (fk)
- name: text (required)
- layout_id: text (required, fk)
- board_type: text
- or: null
  calendar_id   text
- slot_pad: integer (required)
- custom_slots: jsonb (required)
- background: jsonb (required)
- widget_style: text
- or: null
  ord           int (required)
- is_public: boolean (required)
- share_code: text (unique)

### widgets
- id: uuid (pk)
- board_id: uuid (fk)
- user_id: uuid (fk)
- type: text
- variant_id: text (fk)
- settings: jsonb (required)
- database_id: text (fk)
- database_title: text (required)
- calendar_id: text (fk)
- x: integer (required)
- y: integer (required)
- width: integer (required)
- height: integer (required)
- slot_id: text (fk)

### board_drawings
- board_id: uuid (pk, fk)
- user_id: uuid (fk)
- data_url: text

### user_theme
- user_id: uuid (pk, fk)
- active_theme_id: text (required, fk)
- custom_overrides: jsonb (required)
- custom_theme: jsonb
- background: jsonb (required)
- pets_enabled: boolean (required)

### user_credentials
- id: uuid (pk)
- user_id: uuid (fk)
- service: text (required)
- api_key: text
- client_secret: text

### oauth_tokens
- user_id: uuid (fk)
- service: text (required)
- access_token: text

### board_shares
- id: uuid (pk)
- board_id: uuid (fk)
- user_id: uuid (fk)
- role: text (required)
- admin: created_at  timestamptz (required)
