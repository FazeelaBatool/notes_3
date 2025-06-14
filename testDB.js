const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = "mongodb+srv://fazeelabtl:fazeelaa12@cluster0.viuiu.mongodb.net/?retryWrites=true&w=majority";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    await client.db("notesDB").command({ ping: 1 });
    console.log("✅ Pinged your deployment. Successfully connected to MongoDB!");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
  } finally {
    await client.close();
  }
}

run();

//CHANGW