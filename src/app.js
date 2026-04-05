import "dotenv/config";
import cors from "cors";
import express from "express";
import createHttpError from "http-errors";
import connectDB from "./config/db.js";
import scraperRoutes from "./routes/scraper.routes.js";

const app = express();

// Connect to MongoDB
connectDB();

const corsOrigin = process.env.FRONTEND_ORIGIN;
app.use(
  cors(
    corsOrigin
      ? { origin: corsOrigin.split(",").map((o) => o.trim()), credentials: true }
      : { origin: true },
  ),
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/scraper", scraperRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Global error handler
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const body = {
    success: false,
    message:
      createHttpError.isHttpError(err) && err.expose
        ? err.message || "Error"
        : status < 500
          ? err.message || "Error"
          : "Internal server error",
  };
  if (err.duplicates) body.duplicates = err.duplicates;
  if (status >= 500) console.error(err.stack);
  else console.error(err.message);
  res.status(status).json(body);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
