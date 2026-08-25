import app from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./infrastructure/database/prisma.js";

const startServer = async () => {
  try {
    await prisma.$connect();

    console.log("Database connected");

    app.listen(env.PORT, () => {
      console.log(
        `CodeLens backend running on http://localhost:${env.PORT}`
      );
    });
  } catch (error) {
    console.error("Failed to start CodeLens backend:", error);
    process.exit(1);
  }
};

startServer();