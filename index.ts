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

    app.post("/api/client/jobs", async (req, res) => {
      const job = req.body;
      const result = await jobCollection.insertOne(job);
      res.send(result);
    });

    app.get("/api/client/my-jobs", async (req, res) => {
      try {
        const clientEmail = req.query.email;

        if (!clientEmail) {
          return res
            .status(400)
            .send({ error: "Client email parameter is required" });
        }

        // নির্দিষ্ট ক্লায়েন্টের ইমেইল অনুযায়ী ফিল্টার করে সব জব নিয়ে আসা (সবচেয়ে নতুনটা আগে)
        const jobsCard = await jobCollection
          .find({ clientEmail: clientEmail })
          .sort({ _id: -1 })
          .toArray();

        res.send({ success: true, jobsCard });
      } catch (error) {
        console.error("Error fetching client jobs:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
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
