-- ELLE, BIR KEZ, superuser ile (ornek: psql -U emrullah -d postgres -f db-schemas/A00-bootstrap-database.sql).
-- _combined.sql'e GIRMEZ. Docker kullanilmaz; native PostgreSQL 15 (Homebrew postgresql@15).
-- Rol parolasini .env ile esle (CORE_APP_DB_CONNECTION_STRING).
CREATE ROLE create_content WITH LOGIN PASSWORD 'create_content_dev' CREATEDB;
CREATE DATABASE create_content OWNER create_content ENCODING 'UTF8' TEMPLATE template0;
