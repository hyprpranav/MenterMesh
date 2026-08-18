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

const aadhaarUpdates = [
  { name: "Shreevardhann A", aadhaar: "614108920957" },
  { name: "Harish Pranav S", aadhaar: "379067753561" },
  { name: "B S Vasudev Sarvajith", aadhaar: "802745741607" },
  { name: "Kirubanandan P", aadhaar: "488048891714" },
  { name: "Dharshini B", aadhaar: "432311032716" },
  { name: "Dharani T", aadhaar: "334700165197" },
  { name: "Dr. K. Sheik Davood", aadhaar: "676450091000" },
  { name: "Ravindra A", aadhaar: "520764102898" },
  { name: "Subashchandar M", aadhaar: "506083409192" },
  { name: "Suruthi G P", aadhaar: "788281208343" },
  { name: "Shifana M", aadhaar: "8468418934000" },
  { name: "Sharanya R", aadhaar: "704384852177" },
  { name: "Shabana Fareen N", aadhaar: "462889297486" },
  { name: "Dhanyasri K", aadhaar: "304000642127" },
  { name: "Hemanathan A", aadhaar: "590748048549" },
  { name: "Harini S", aadhaar: "979337032716" },
  { name: "Shalena Mearsha A", aadhaar: "994497426317" },
  { name: "Sivasankari S K", aadhaar: "848715202516" },
  { name: "Varun Kumar M", aadhaar: "553042198774" },
  { name: "J Kamesh Kumar", aadhaar: "796469470265" },
  { name: "Sujin Infant Roy J", aadhaar: "760397371145" },
  { name: "Gowtham N K", aadhaar: "740716038566" },
  { name: "Divani Shree S", aadhaar: "231394555387" },
];

async function updateAadhaarNumbers() {
  console.log("🔄 Starting Aadhaar number updates...\n");

  let updated = 0;
  let notFound = 0;

  for (const update of aadhaarUpdates) {
    try {
      // Search for user by name (case-insensitive)
      const query = await db
        .collection("users")
        .where("name", "==", update.name)
        .get();

      if (query.empty) {
        console.log(`❌ Not found: ${update.name}`);
        notFound++;
        continue;
      }

      // Update first match
      const userDoc = query.docs[0];
      await userDoc.ref.update({
        aadhaarNumber: update.aadhaar,
      });

      console.log(`✅ Updated: ${update.name} → ${update.aadhaar}`);
      updated++;
    } catch (err) {
      console.error(`⚠️  Error updating ${update.name}:`, err.message);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Not found: ${notFound}`);
  console.log(`   Total: ${aadhaarUpdates.length}`);

  process.exit(0);
}

updateAadhaarNumbers().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
