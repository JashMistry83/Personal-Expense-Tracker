CREATE TABLE expense(
	id SERIAL PRIMARY KEY,
	description VARCHAR2(400) NOT NULL,
	transfer_to VARCHAR2(50) NOT NULL,
	amount_rs NUMERIC(100) NOT NULL
);

ALTER TABLE expense 
ADD COLUMN user_id INTEGER;

ALTER TABLE expense
ADD CONSTRAINT fk_constraint 
FOREIGN KEY (user_id)
REFERENCES users(id);

CREATE TABLE users(
	id SERIAL PRIMARY KEY,
	name VARCHAR(100) NOT NULL,
	gmail VARCHAR(255) NOT NULL UNIQUE,
	password VARCHAR(60) NOT NULL,
	ph_no VARCHAR(20) UNIQUE
)


-- Drop the old table if you want a fresh start, or just run the ALTER command below
-- DROP TABLE expense;

-- If keeping data, add the new column. If starting fresh, just add this column to the CREATE statement.
ALTER TABLE expense 
ADD COLUMN type VARCHAR(20) DEFAULT 'expense';

-- Ensure your users table exists as before
-- CREATE TABLE users (...) as per your original file.