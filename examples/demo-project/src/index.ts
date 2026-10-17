const apiUrl = process.env.API_URL;
const dbUrl = process.env.DATABASE_URL;

// STRIPE_SECRET_KEY is used here but was never added to .env.example or to
// the local .env — this is the drift EnvAccord is meant to catch.
const { STRIPE_SECRET_KEY } = process.env;

console.log(apiUrl, dbUrl, STRIPE_SECRET_KEY);
