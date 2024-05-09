module.exports = `create table invoices(
  billing_city text,
  customer_id integer not null ,
  id integer not null ,
  billing_address text,
  billing_country text,
  total numeric not null ,
  invoice_date timestamp without time zone not null ,
  billing_postal_code text,
  billing_state text,
);
create table invoice_lines(
  quantity integer not null ,
  invoice_id integer not null ,
  id integer not null ,
  unit_price numeric not null ,
  track_id integer not null ,
);
create table employees(
  reports_to integer,
  phone text,
  email text,
  last_name text not null ,
  state text,
  postal_code text,
  country text,
  id integer not null ,
  title text,
  hire_date timestamp without time zone,
  city text,
  fax text,
  first_name text not null ,
  address text,
  birth_date timestamp without time zone,
);
create table tracks(
  composer text,
  bytes integer,
  unit_price numeric not null ,
  milliseconds integer not null ,
  album_id integer not null ,
  id integer not null ,
  media_type_id integer not null ,
  name text not null ,
  genre_id integer,
);
create table media_types(
  id integer not null ,
  name text,
);
create table artists(
  name text,
  id integer not null ,
);
create table albums(
  title text not null ,
  id integer not null ,
  artist_id integer not null ,
  sku text,
);
create table playlists_tracks(
  playlist_id integer not null ,
  track_id integer not null ,
);
create table sales(
  unit_price numeric,
  invoice_date timestamp without time zone,
  album_title text,
  media_type text,
  track_name text,
  customer_name text,
  invoice_id integer,
  customer_company text,
  quantity integer,
  composer text,
);
create table customers(
  support_rep_id integer,
  address text,
  fax text,
  phone text,
  email text not null ,
  first_name text not null ,
  last_name text not null ,
  postal_code text,
  state text,
  company text,
  id integer not null ,
  city text,
  country text,
);
create table playlists(
  id integer not null ,
  name text,
);
create table genres(
  name text,
  id integer not null ,
);`