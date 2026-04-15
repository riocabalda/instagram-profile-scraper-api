import "dotenv/config";
import mongoose from "mongoose";
import Input from "../src/models/Input.model.js";
import Profile from "../src/models/Profile.model.js";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME,
    });
    console.log("✓ MongoDB connected");
  } catch (err) {
    console.error("✗ MongoDB connection error:", err.message);
    process.exit(1);
  }
};

const seedInputsFromProfiles = async () => {
  try {
    console.log("Starting seeder: seedInputsFromProfiles");
    console.log("---");

    // Fetch all unique usernames from profiles collection
    console.log("Fetching all unique usernames from profiles collection...");
    const profiles = await Profile.find({}).select("username").lean();

    if (!profiles || profiles.length === 0) {
      console.log("✗ No profiles found in the database.");
      return;
    }

    const uniqueUsernames = [...new Set(profiles.map((p) => p.username))];
    console.log(
      `✓ Found ${profiles.length} profiles with ${uniqueUsernames.length} unique usernames`,
    );
    console.log("---");

    // Create input documents
    const inputDocuments = uniqueUsernames.map((username) => ({
      username,
    }));

    // Insert into inputs collection (using insertMany with ordered: false to skip duplicates)
    console.log(
      `Inserting ${inputDocuments.length} usernames into inputs collection...`,
    );
    const result = await Input.insertMany(inputDocuments, { ordered: false });

    console.log(`✓ Successfully inserted ${result.length} documents`);
    console.log("---");
    console.log("Seeding completed successfully!");
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key error - some documents were inserted, some were duplicates
      const insertedCount = err.result?.insertedCount || 0;
      console.log(
        `⚠ Partial insertion completed. ${insertedCount} new usernames inserted (rest were duplicates).`,
      );
    } else {
      console.error("✗ Error during seeding:", err.message);
    }
  } finally {
    await mongoose.connection.close();
    console.log("✓ MongoDB connection closed");
    process.exit(0);
  }
};

// Run the seeder
connectDB().then(() => seedInputsFromProfiles());
