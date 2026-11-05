-- Runs once when the Postgres container volume is first created.
-- Creates a separate database used only by the integration test suite.
CREATE DATABASE schemesaathi_test OWNER saathi;
