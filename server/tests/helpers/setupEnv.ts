// Runs before every test file: force the test environment so `env.databaseUrl`
// points at TEST_DATABASE_URL and logs stay quiet.
process.env.NODE_ENV = 'test';
