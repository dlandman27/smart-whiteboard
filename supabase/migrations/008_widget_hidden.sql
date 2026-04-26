-- Add is_hidden column to widgets table for non-destructive layout switching.
-- Widgets hidden by a layout switch retain their data and can be restored
-- automatically when a layout with more slots is applied.
alter table widgets add column if not exists is_hidden boolean not null default false;
