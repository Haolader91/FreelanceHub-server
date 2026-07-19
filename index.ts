import express, { type Express, type Request, type Response } from "express";
import { MongoClient } from "mongodb";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app: Express = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error(
    "[CONFIG ERROR]: MONGODB_URI environment variable is missing in your .env file!",
  );
}

const client = new MongoClient(uri);

export async function connectToMongoDB() {
  try {
    await client.connect();

    const database = client.db(process.env.AUTH_BD_NAME);
    const jobCollection = database.collection("jobs");

    app.post("/api/jobs", async (req, res) => {
      const job = req.body;
      const result = await jobCollection.insertOne(job);
      res.send(result);
    });

    console.log("You successfully connected to MongoDB!");

    return client;
  } catch (err) {
    console.dir(err);
  }
}

// Call this only when your application terminates

export async function disconnectFromMongoDB() {
  await client.close();
}

// Main root mapping health check endpoint execution
app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

// Initializing application listening server engine
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
connectToMongoDB();
