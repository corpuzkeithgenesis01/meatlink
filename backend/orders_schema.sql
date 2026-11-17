create table orders (
  id bigint generated always as identity primary key,
  user_id bigint not null references users(id),
  status text not null default 'pending'
    check (status in ('pending','confirmed','ready','completed','cancelled')),
  buyer_type text not null default 'retail'
    check (buyer_type in ('retail','wholesale')),
  pickup_notes text,
  total numeric(10,2) not null default 0,
  created_at timestamptz default now()
);

create table order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references orders(id) on delete cascade,
  product_id bigint not null references products(id),
  product_name text not null,
  unit_price numeric(10,2) not null,
  quantity integer not null check (quantity > 0),
  unit text not null default 'kg'
);

create table push_subscriptions (
  id bigint generated always as identity primary key,
  user_id bigint not null references users(id),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);