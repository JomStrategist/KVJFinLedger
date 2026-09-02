import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://kvj_app:AjayThomas%401@kvj-analytics.f8diqn6.mongodb.net/billing_erp?retryWrites=true&w=majority&appName=KVJ-Analytics";

async function test() {
  console.log("Connecting with mongodb driver...");
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("Connected successfully to MongoDB Atlas!");
    const db = client.db("billing_erp");
    const users = await db.collection("User").find({}).toArray();
    console.log("Users in db:", users.map(u => ({ email: u.email, role: u.role })));
  } catch (err) {
    console.error("Connection failed:", err);
  } finally {
    await client.close();
  }
}

test();
