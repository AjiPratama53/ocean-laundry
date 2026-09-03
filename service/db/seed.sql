INSERT INTO packages (id, name, price) VALUES
  ('pkg_001', 'Regular Wash', 8000),
  ('pkg_002', 'Express Wash', 15000);

INSERT INTO orders (id, customer_id, package_id, pickup_address, status) VALUES
  ('ord_001', 'cus_001', 'pkg_001', 'Jl. Kaliurang No. 10', 'placed');