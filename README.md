# The Chat DBA

This is an experimental chat participant that uses Copilot to generate table schemas and also run queries.

## Step 1: Create Some Tables

You can use simple terms to build the table that you need. For instance:

```
@dba /table customers
```

This will return a schema for a `customers` table and also prep 10 test records. Here's an example chat using the above prompt, though, of course, results will vary based on Copilot's current mood:

```sql
-- Drop table if already exists
DROP TABLE IF EXISTS customers;

-- Create table
CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone_number TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    postal_code TEXT,
    age INTEGER,
    balance REAL,
    is_active INTEGER,
    is_premium INTEGER,
    notes TEXT,
    created_at DATE DEFAULT (date('now','localtime')),
    updated_at DATE DEFAULT (date('now','localtime'))
);

-- Insert test data
INSERT INTO customers (first_name, last_name, email, phone_number, address, city, state, country, postal_code, age, balance, is_active, is_premium, notes)
VALUES ('John', 'Doe', 'johndoe@example.com', '1234567890', '123 Main St', 'New York', 'NY', 'USA', '10001', 30, 1000.50, 1, 1, 'Test note 1'),
       ('Jane', 'Smith', 'janesmith@example.com', '9876543210', '456 Oak St', 'Los Angeles', 'CA', 'USA', '90001', 25, 500.75, 1, 0, 'Test note 2'),
       ('Mike', 'Johnson', 'mikejohnson@example.com', '5555555555', '789 Maple Ave', 'Chicago', 'IL', 'USA', '60601', 35, 1500.25, 0, 1, 'Test note 3'),
       ('Emily', 'Brown', 'emilybrown@example.com', '1231231234', '321 Elm St', 'Houston', 'TX', 'USA', '77001', 28, 900.50, 1, 0, 'Test note 4'),
       ('Andrew', 'Wilson', 'andrewwilson@example.com', '9998887777', '654 Pine St', 'San Francisco', 'CA', 'USA', '94101', 32, 2000.75, 1, 1, 'Test note 5'),
       ('Jessica', 'Taylor', 'jessicataylor@example.com', '1112223333', '987 Cedar Ave', 'Boston', 'MA', 'USA', '02101', 27, 800.25, 0, 0, 'Test note 6'),
       ('David', 'Davis', 'daviddavis@example.com', '4446668888', '741 Oakwood St', 'Atlanta', 'GA', 'USA', '30301', 31, 1800.50, 1, 1, 'Test note 7'),
       ('Anna', 'Lee', 'annalee@example.com', '7779991111', '963 Walnut St', 'Seattle', 'WA', 'USA', '98101', 29, 700.75, 0, 0, 'Test note 8'),
       ('Kevin', 'Clark', 'kevinclark@example.com', '2223334444', '852 Birch Ave', 'Miami', 'FL', 'USA', '33101', 34, 1600.25, 0, 1, 'Test note 9'),
       ('Sara', 'Miller', 'saramiller@example.com', '5554443333', '159 Oakwood Ave', 'Dallas', 'TX', 'USA', '75201', 33, 1900.75, 1, 0, 'Test note 10');
```

You can add another prompt for an `orders` table, and I find it a good idea to make sure you specify that it's related:

```
@dba /table orders related to customers
```

The result:

```sql
DROP TABLE IF EXISTS orders;

CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER,
  product_id INTEGER,
  quantity INTEGER,
  price REAL,
  discount REAL,
  total REAL,
  status TEXT,
  notes TEXT,
  created_at DATE DEFAULT (DATE('now')),
  updated_at DATE DEFAULT (DATE('now'))
);

INSERT INTO orders (customer_id, product_id, quantity, price, discount, total, status, notes)
VALUES (1, 101, 3, 25.99, 0.1, 70.17, 'Pending', 'Please expedite'),
       (2, 102, 5, 15.5, 0.05, 73.98, 'Shipped', 'Delivery address changed'),
       (3, 103, 1, 100.0, NULL, 100.0, 'Delivered', NULL),
       (4, 104, 2, 80.0, 0.2, 128.0, 'Cancelled', 'Out of stock'),
       (5, 101, 1, 25.99, 0.0, 25.99, 'Delivered', NULL),
       (6, 102, 4, 15.5, 0.05, 58.88, 'Shipped', 'Delivery delayed'),
       (7, 103, 2, 100.0, NULL, 200.0, 'Pending', 'Please confirm stock'),
       (8, 104, 3, 80.0, 0.0, 240.0, 'Shipped', 'Tracking number: 123456789'),
       (9, 101, 5, 25.99, 0.2, 103.96, 'Pending', 'Payment pending'),
       (10, 102, 1, 15.5, 0.1, 13.95, 'Cancelled', 'Duplicate order');
```

Notice that the `orders` table has a `customer_id` and the test data correctly relates the test records.

## Step 2: Review

All of the SQL created in the `/table` step will open up in a file in the editor and also be shown in the chat window. If it's usable, we're done! Or the user can edit it as they want.

One issue, for now, is that if they change it and run `/table` again, it will be overwritten due to sync rules that I haven't been able to figure out just yet. I'll get there. Running a query, however, will work fine.

## Step 3: Querying

You can now query your schema, as all of the SQL above is being applied to an actual SQLite database, which is stored in a `/temp` directory in the extension. To query the data, you just ask:

```
@dba /query orders for saramiller@example.com
```

This is a tough one as _sometimes_ Copilot will get confused and ask what you want to do. The `/query` command will be aware of the schema because all of it is loaded up to Copilot when the query is requested.

When it works, it's pretty fun:

```sql
SELECT orders.id, customers.first_name, customers.last_name, orders.product_id, orders.quantity, orders.price, orders.discount, orders.total, orders.status, orders.notes
FROM orders
JOIN customers ON orders.customer_id = customers.id
WHERE customers.email = 'saramiller@example.com';
```

The results are also returned, right in the chat window:

```json
[
  {
    "id": 10,
    "first_name": "Sara",
    "last_name": "Miller",
    "product_id": 102,
    "quantity": 1,
    "price": 15.5,
    "discount": 0.1,
    "total": 13.95,
    "status": "Cancelled",
    "notes": "Duplicate order"
  }
]
```

## To Do

A few things to figure out:

- [ ] How to better sync things and allow for concurrent editing?
- [ ] Better consistency with the schema generation. It's OK, for now, but sometimes gets weird and I can't figure out why.
- [ ] Do we want to hand over the SQlite db file?
