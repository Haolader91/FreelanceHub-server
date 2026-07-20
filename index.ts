import express, { type Express, type Request, type Response } from "express";
import { MongoClient, ObjectId } from "mongodb";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error(
    "[CONFIG ERROR]: MONGODB_URI environment variable is missing in your .env file!",
  );
}

const client = new MongoClient(uri);

// Database Collection references
const database = client.db(process.env.AUTH_BD_NAME);
const jobCollection = database.collection("jobs");
const applicationsCollection = database.collection("applications");

async function connectDB() {
  try {
    console.log("You successfully connected to MongoDB!");
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
  }
}

connectDB();

// ---------------- ROUTES ----------------

// Health check endpoint
app.get("/", (req: Request, res: Response) => {
  res.send("Hello World! FreelanceHub Server is running.");
});

// Post a new job
app.post("/api/client/jobs", async (req: Request, res: Response) => {
  try {
    const job = req.body;
    const result = await jobCollection.insertOne(job);
    res.send(result);
  } catch (error) {
    res.status(500).send({ success: false, error: "Internal Server Error" });
  }
});

// Fetch client specific jobs
app.get("/api/client/my-jobs", async (req: Request, res: Response) => {
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

// Fetch all global jobs
app.get("/api/client/jobs", async (req: Request, res: Response) => {
  try {
    const jobsCard = await jobCollection.find({}).sort({ _id: -1 }).toArray();

    res.send({ success: true, jobsCard });
  } catch (error) {
    console.error("Error fetching all global jobs:", error);
    res.status(500).send({ success: false, error: "Internal Server Error" });
  }
});

// Fetch single job by ID
app.get("/api/client/jobs/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const job = await jobCollection.findOne({ _id: new ObjectId(id) });

    if (!job) {
      return res.status(404).send({ success: false, message: "Job not found" });
    }

    res.send({ success: true, job });
  } catch (error) {
    console.error("Error fetching single job by ID:", error);
    res.status(500).send({ success: false, error: "Internal Server Error" });
  }
});

// Applications API
app.post("/api/applications", async (req: Request, res: Response) => {
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
    res.status(500).send({ success: false, error: "Internal Server Error" });
  }
});

// Fetch applications for a specific client
app.get("/api/client/applications", async (req: Request, res: Response) => {
  try {
    const clientEmail = req.query.email as string;

    if (!clientEmail) {
      return res.status(400).send({
        success: false,
        message: "Client email parameter is required",
      });
    }

    const applications = await applicationsCollection
      .find({
        $or: [
          { clientEmail: clientEmail },

          { clientName: clientEmail.split("@")[0] },
        ],
      })
      .sort({ _id: -1 })
      .toArray();

    res.send({ success: true, applications });
  } catch (error) {
    console.error("Error fetching client applications:", error);
    res.status(500).send({ success: false, error: "Internal Server Error" });
  }
});

// Local Development listen
if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

// *** VERCEL SERVERLESS REQUIREMENT ***
export default app;
