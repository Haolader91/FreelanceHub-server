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
    const applicationsCollection = database.collection("applications");

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
    // all jobs
    app.get("/api/client/jobs", async (req, res) => {
      try {
        const jobsCard = await jobCollection
          .find({})
          .sort({ _id: -1 })
          .toArray();

        res.send({ success: true, jobsCard });
      } catch (error) {
        console.error("Error fetching all global jobs:", error);
        res
          .status(500)
          .send({ success: false, error: "Internal Server Error" });
      }
    });
    // details page api
    app.get("/api/client/jobs/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { ObjectId } = require("mongodb");

        const job = await jobCollection.findOne({ _id: new ObjectId(id) });

        if (!job) {
          return res
            .status(404)
            .send({ success: false, message: "Job not found" });
        }

        res.send({ success: true, job });
      } catch (error) {
        console.error("Error fetching single job by ID:", error);
        res
          .status(500)
          .send({ success: false, error: "Internal Server Error" });
      }
    });

    // applications api
    app.post("/api/applications", async (req, res) => {
      try {
        const application = req.body;

        const query = {
          jobId: application.jobId,
          applicantEmail: application.applicantEmail,
        };

        const alreadyApplied = await applicationsCollection.findOne(query);
        if (alreadyApplied) {
          return res.status(400).send({
            success: false,
            message: "You have already submitted a proposal for this project!",
          });
        }

        const result = await applicationsCollection.insertOne(application);
        res.status(201).send({
          success: true,
          message: "Proposal submitted successfully!",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Error saving application to DB:", error);
        res
          .status(500)
          .send({ success: false, error: "Internal Server Error" });
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
