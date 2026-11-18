delete from messages;
alter table messages add column buyer_id bigint not null references users(id);
create index messages_buyer_created_idx on messages (buyer_id, created_at);