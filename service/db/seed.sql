INSERT INTO packages (id, name, description, price) VALUES
  ('pkg_001', 'Regular Wash', 'Cuci lipat 2 hari' 8000),
  ('pkg_002', 'Express Wash', 'Cuci lipat 1 hari' , 15000);

INSERT INTO orders (id, customer_id, package_id, pickup_address, status) VALUES
  ('ord_001', 'cus_001', 'pkg_001', 'Jl. Kaliurang No. 10', 'placed');