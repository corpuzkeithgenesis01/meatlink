-- Run this in Supabase SQL Editor.
-- Stores the wholesale discount applied to an order.

alter table orders
  add column if not exists discount numeric(10,2) not null default 0;
