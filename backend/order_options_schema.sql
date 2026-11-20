-- Run this in Supabase SQL Editor.
-- Adds pickup/delivery, delivery address, and payment method to orders.

alter table orders
  add column if not exists fulfillment text not null default 'pickup'
    check (fulfillment in ('pickup', 'delivery')),
  add column if not exists payment_method text not null default 'cop'
    check (payment_method in ('cod', 'cop')),
  add column if not exists delivery_street text,
  add column if not exists delivery_barangay text,
  add column if not exists delivery_municipality text;
