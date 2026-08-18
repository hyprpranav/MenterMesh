import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../serviceAccountKey.json"), "utf8")
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function listAllUsers() {
  const snap = await db.collection("users").get();
  console.log(`Total users: ${snap.size}\n`);
  snap.docs.forEach((doc) => {
    const user = doc.data();
    console.log(`UID: ${doc.id}`);
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`---`);
  });
  process.exit(0);
}

listAllUsers().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
