import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });
dotenvConfig({ path: ".env" });

import { connectDatabase, disconnectDatabase } from "../database/connection.js";
import BusinessService from "../services/BusinessService.js";

const SAMPLE_BUSINESS = {
  companyName: "Quick Shop",
  ownerName: "Rajesh Kumar",
  phone: "+91-98765-43210",
  email: "hello@quickshop.in",
  website: "https://quickshop.example.com",
  gstNumber: "29ABCDE1234F1Z5",
  currency: "INR",
  address: {
    addressLine: "123 Main Road, Indiranagar",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    postalCode: "560038",
  },
};

async function main() {
  try {
    await connectDatabase();
    const doc = await BusinessService.getOrCreateDefault(SAMPLE_BUSINESS);
    console.log("✅ Sample business ready:", JSON.stringify(doc, null, 2));
  } catch (e) {
    console.error("❌ Seed failed:", e);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

main();
