const dev = {
  API_ENDPOINT_URL: "http://localhost:5001/api"   // Local backend
};

const prod = {
  API_ENDPOINT_URL: "https://yourdomain.com/api"  // Live backend
};

const test = {
  API_ENDPOINT_URL: "https://staging.yourdomain.com/api" // Staging backend
};

const getEnv = () => {
  switch (process.env.NODE_ENV) {
    case "development":
      return dev;
    case "production":
      return prod;
    case "test":
      return test;
    default:
      return dev; // fallback to dev
  }
};

export const env = getEnv();
