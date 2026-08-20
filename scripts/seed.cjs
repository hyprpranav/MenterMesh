// ============================================================
// MentorMesh — User Seed Script
// ============================================================
// HOW TO RUN:
//   1. Download serviceAccountKey.json from Firebase Console
//      → Project Settings → Service Accounts → Generate new private key
//   2. Place serviceAccountKey.json in the project ROOT folder
//   3. Run: node scripts/seed-users.mjs
// ============================================================

import { readFileSync } from "fs";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const admin = require("firebase-admin");

// ── Load service account key ─────────────────────────────────
let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync("./serviceAccountKey.json", "utf8"));
} catch {
  console.error("❌  serviceAccountKey.json not found in project root!");
  console.error("    Download it from Firebase Console → Project Settings → Service Accounts");
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const auth = admin.auth();
const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();

// ── Helper: clean phone number ───────────────────────────────
const phone = (p) => p ? p.toString().replace(/\s+/g, "").replace(/[^0-9+]/g, "") : "";

// ── All Users Data ───────────────────────────────────────────
const USERS = [

  // ── DEVELOPER / MASTER ACCOUNT ──────────────────────────
  {
    email: "hyprpranav@gmail.com",
    password: "927624BEC066",
    name: "Harish Pranav S (Dev)",
    role: "master",
    status: "active",
    department: "ECE",
    year: "III",
    section: "B",
    registerNumber: "927624BEC066",
    phone: "7845693765",
    personalEmail: "harishpranavs259@gmail.com",
    alternateEmail: "harishspranav2006@gmail.com",
    dateOfBirth: "14-01-2006",
    bloodGroup: "O+ve",
    address: "361-1- Thiyagi Alagarsamy Kovil Street, Anna Nagar, Batlagundu, Dindigul 624202",
    links: ["https://github.com/hyprpranav"],
    skills: [],
  },

  // ── STAFF ACCOUNT ────────────────────────────────────────
  {
    email: "sheikdavoodk.ece@mkce.ac.in",
    password: "9865314886",
    name: "Dr. K. Sheik Davood",
    role: "staff",
    status: "active",
    department: "ECE",
    year: "",
    section: "",
    registerNumber: "",
    phone: "9865314886",
    personalEmail: "sheikdavoodece@gmail.com",
    alternateEmail: "",
    dateOfBirth: "31-07-1986",
    bloodGroup: "B+ve",
    address: "152/2, Muslim Street, Paramathi, Namakkal - 637207",
    links: [],
    skills: [],
  },

  // ── STUDENTS ─────────────────────────────────────────────
  {
    email: "927624bec207@mkce.ac.in", password: "927624BEC207",
    name: "Shreevardhann A", role: "student", status: "active",
    department: "ECE", year: "III", section: "D", registerNumber: "927624BEC207",
    phone: "9543996929", personalEmail: "shreevardhann2006@gmail.com",
    alternateEmail: "shreevardhann06@gmail.com", dateOfBirth: "29-11-2006",
    bloodGroup: "O+ve", address: "6, Brindavan Nagar, 1st Cross Kurinji Nagar, Valappady, Salem",
    links: ["https://github.com/shreevardhann2006", "https://www.linkedin.com/in/shreevardhann/", "https://shreevardhann-portfolio.vercel.app/"],
    skills: [],
  },
  {
    email: "927624bec066@mkce.ac.in", password: "927624BEC066",
    name: "Harish Pranav S", role: "student", status: "active",
    department: "ECE", year: "III", section: "B", registerNumber: "927624BEC066",
    phone: "7845693765", personalEmail: "harishpranavs259@gmail.com",
    alternateEmail: "harishspranav2006@gmail.com", dateOfBirth: "14-01-2006",
    bloodGroup: "O+ve", address: "361-1- Thiyagi Alagarsamy Kovil Street, Anna Nagar, Batlagundu, Dindigul 624202",
    links: ["https://github.com/hyprpranav"], skills: [],
  },
  {
    email: "927625bec300@mkce.ac.in", password: "927625BEC300",
    name: "B S Vasudev Sarvajith", role: "student", status: "active",
    department: "ECE", year: "II", section: "E", registerNumber: "927625BEC300",
    phone: "9626365902", personalEmail: "bsvasudevsarvajith@gmail.com",
    alternateEmail: "vasudevsarvajith2007@gmail.com", dateOfBirth: "04-09-2007",
    bloodGroup: "B+ve", address: "101A/3, Thillai Nagar, S.Vellalapatti, Karur - 639004",
    links: [], skills: [],
  },
  {
    email: "927625bec133@mkce.ac.in", password: "927625BEC133",
    name: "Kirubanandan P", role: "student", status: "active",
    department: "ECE", year: "II", section: "C", registerNumber: "927625BEC133",
    phone: "9626404345", personalEmail: "kirubanandan887@gmail.com",
    alternateEmail: "kirubanandan212008@gmail.com", dateOfBirth: "21-04-2008",
    bloodGroup: "B+ve", address: "1/52A, Mariamman Kovil Street, Singilipatti, Velagoundampatti, Namakkal 637212",
    links: ["https://www.linkedin.com/in/kirubanandan-paramasivam-b78576415"], skills: [],
  },
  {
    email: "927624bec043@mkce.ac.in", password: "927624BEC043",
    name: "Dharshini B", role: "student", status: "active",
    department: "ECE", year: "III", section: "A", registerNumber: "927624BEC043",
    phone: "6369729276", personalEmail: "dharshiniboopathi84@gmail.com",
    alternateEmail: "dharshiniaarik44@gmail.com", dateOfBirth: "02-05-2007",
    bloodGroup: "O+ve", address: "3/5, Mahalakshmi Amman Kovil Street, Mahadhanapuram, Karur 639105",
    links: ["https://www.linkedin.com/in/dharshini-boopathi-53445137a"], skills: [],
  },
  {
    email: "927624bec038@mkce.ac.in", password: "927624BEC038",
    name: "Dharani T", role: "student", status: "active",
    department: "ECE", year: "III", section: "A", registerNumber: "927624BEC038",
    phone: "7812891984", personalEmail: "dharanithangavel593@gmail.com",
    alternateEmail: "", dateOfBirth: "06-07-2006",
    bloodGroup: "O+ve", address: "3/236, Nallappanaickanpalayam, Kunnamalai, Paramathi Velur, Namakkal - 637203",
    links: ["https://www.linkedin.com/in/dharani-thangavel-0093b8334a"], skills: [],
  },
  {
    email: "927624bec174@mkce.ac.in", password: "927624BEC174",
    name: "Ravindra A", role: "student", status: "active",
    department: "ECE", year: "III", section: "C", registerNumber: "927624BEC174",
    phone: "7397797189", personalEmail: "a.ravindra2006@gmail.com",
    alternateEmail: "ravindra05079@gmail.com", dateOfBirth: "05-07-2006",
    bloodGroup: "A2+ve", address: "LR Nivas, Near Leo School, Annamaliar Mills Colony, Dindigul",
    links: [], skills: [],
  },
  {
    email: "927625bec276@mkce.ac.in", password: "927625BEC276",
    name: "Subashchandar M", role: "student", status: "active",
    department: "ECE", year: "II", section: "E", registerNumber: "927625BEC276",
    phone: "7708075621", personalEmail: "smsubash2007@gmail.com",
    alternateEmail: "", dateOfBirth: "05-08-2007",
    bloodGroup: "A+ve", address: "2/38, West Street, Karaikurichi, Namakkal, Tamil Nadu - 637014",
    links: ["https://www.linkedin.com/in/subashchandar-m-3a7515415"], skills: [],
  },
  {
    email: "927624bec230@gmail.com", password: "927624BEC230",
    name: "Suruthi G P", role: "student", status: "active",
    department: "ECE", year: "III", section: "D", registerNumber: "927624BEC230",
    phone: "9363091106", personalEmail: "suruthigp.dgl@gmail.com",
    alternateEmail: "suruthiganesan006@gmail.com", dateOfBirth: "09-11-2006",
    bloodGroup: "B+ve", address: "Postal Colony, 1st Street, N.S.Nagar, Dindigul",
    links: ["https://www.linkedin.com/in/suruthi-ganesan-9b99383a9"], skills: [],
  },
  {
    email: "927625bec262@mkce.ac.in", password: "927625BEC262",
    name: "Shifana M", role: "student", status: "active",
    department: "ECE", year: "II", section: "E", registerNumber: "927625BEC262",
    phone: "9790451203", personalEmail: "mshifanasulthan@gmail.com",
    alternateEmail: "", dateOfBirth: "14-03-2008",
    bloodGroup: "O+ve", address: "40, Sakthi Nagar, Periyar Nagar, Kulithalai, Tamil Nadu - 639104",
    links: ["https://www.linkedin.com/in/shifana-m-5a44b3385"], skills: [],
  },
  {
    email: "927625bec261@mkce.ac.in", password: "927625BEC261",
    name: "Sharanya R", role: "student", status: "active",
    department: "ECE", year: "II", section: "E", registerNumber: "927625BEC261",
    phone: "8682959620", personalEmail: "sharanyar8286@gmail.com",
    alternateEmail: "", dateOfBirth: "30-01-2008",
    bloodGroup: "AB+ve", address: "2/103 D, ECC Road, Naidupuram, Kodaikanal, Dindigul",
    links: ["https://www.linkedin.com/in/sharanya-r-7b1b51409"], skills: [],
  },
  {
    email: "927625bec254@mkce.ac.in", password: "927625BEC254",
    name: "Shabana Fareen N", role: "student", status: "active",
    department: "ECE", year: "II", section: "E", registerNumber: "927625BEC254",
    phone: "9003883098", personalEmail: "shabanafareen@gmail.com",
    alternateEmail: "", dateOfBirth: "03-10-2007",
    bloodGroup: "B+ve", address: "F-300, TNPL Colony, Kagithapuram, Karur - 639136",
    links: [], skills: [],
  },
  {
    email: "927624bec036@mkce.ac.in", password: "927624BEC036",
    name: "Dhanyasri K", role: "student", status: "active",
    department: "ECE", year: "III", section: "A", registerNumber: "927624BEC036",
    phone: "8825639702", personalEmail: "dhanyasrikailasam@gmail.com",
    alternateEmail: "dhanyayogesh65@gmail.com", dateOfBirth: "30-08-2006",
    bloodGroup: "O+ve", address: "1/53 Gounder Street, Vallipuram Post, Namakkal - 637003",
    links: [], skills: [],
  },
  {
    email: "927624bec072@mkce.ac.in", password: "927624BEC072",
    name: "Hemanathan A", role: "student", status: "active",
    department: "ECE", year: "III", section: "B", registerNumber: "927624BEC072",
    phone: "7904175696", personalEmail: "hemanathan2k1@gmail.com",
    alternateEmail: "hemanathan8337@gmail.com", dateOfBirth: "01-02-2007",
    bloodGroup: "A+ve", address: "4/13, South Street, Morattupalayam, Tiruppur - 638752",
    links: ["https://www.linkedin.com/in/hemanathan-a-a80997325/"], skills: [],
  },
  {
    email: "927624bec061@mkce.ac.in", password: "927624BEC061",
    name: "Harini S", role: "student", status: "active",
    department: "ECE", year: "III", section: "A", registerNumber: "927624BEC061",
    phone: "8148075159", personalEmail: "hariniselvarasu07@gmail.com",
    alternateEmail: "harinipersonal27@gmail.com", dateOfBirth: "27-02-2007",
    bloodGroup: "B+ve", address: "3/444, North Street, Akkanur, Cuddalore - 606106",
    links: ["https://www.linkedin.com/in/harini-s-795624399/"], skills: [],
  },
  {
    email: "927625bec256@mkce.ac.in", password: "927625BEC256",
    name: "Shalena Mearsha A", role: "student", status: "active",
    department: "ECE", year: "II", section: "E", registerNumber: "927625BEC256",
    phone: "9994813641", personalEmail: "shalena904@gmail.com",
    alternateEmail: "shalena1403@gmail.com", dateOfBirth: "14-03-2007",
    bloodGroup: "A-ve", address: "3, F Block, Indira Gandhi Nagar, South Gandhigramam, Thanthonimalai Post, Karur",
    links: ["https://www.linkedin.com/in/shalena-mearsha-a-b9993b392/"], skills: [],
  },
  {
    email: "927625bec266@mkce.ac.in", password: "927625BEC266",
    name: "Sivasankari S K", role: "student", status: "active",
    department: "ECE", year: "II", section: "E", registerNumber: "927625BEC266",
    phone: "8778837316", personalEmail: "sivasankarisk810@gmail.com",
    alternateEmail: "drishyadishu2007@gmail.com", dateOfBirth: "08-10-2007",
    bloodGroup: "O+ve", address: "45F, Murugan Nagar 2nd Cross, Muthaladampatti, Thanthonimalai, Karur",
    links: [], skills: [],
  },
  {
    email: "927625bec297@mkce.ac.in", password: "927625BEC297",
    name: "Varun Kumar M", role: "student", status: "active",
    department: "ECE", year: "II", section: "E", registerNumber: "927625BEC297",
    phone: "6369772837", personalEmail: "varunkumarm4683@gmail.com",
    alternateEmail: "vkumarm700@gmail.com", dateOfBirth: "28-07-2008",
    bloodGroup: "O+ve", address: "10/42L, Sivasakthi Nagar, Vennaimalai, Karur 639006",
    links: ["https://www.linkedin.com/in/varun-kumar-m-761707309"], skills: [],
  },
  {
    email: "927625bec073@mkce.ac.in", password: "927625BEC073",
    name: "Divani Shree S", role: "student", status: "active",
    department: "ECE", year: "II", section: "B", registerNumber: "927625BEC073",
    phone: "9514407171", personalEmail: "divanishree1208@gmail.com",
    dateOfBirth: "12-07-2008", aadhaarNumber: "231394555387",
    bloodGroup: "O+ve", address: "100/1, Lakshmi Nagar, Kunnanur North, Emur, Karur",
    links: ["https://www.linkedin.com/in/divani-shree-9a46b3381"], skills: [],
  },
  {
    email: "927625bec114@mkce.ac.in", password: "927625BEC114",
    name: "J Kamesh Kumar", role: "student", status: "active",
    department: "ECE", year: "II", section: "B", registerNumber: "927625BEC114",
    phone: "7708360503", personalEmail: "kameshjeyaram@gmail.com",
    alternateEmail: "kameshkumarj58905@gmail.com", dateOfBirth: "05-03-2008",
    bloodGroup: "A+ve", address: "26, Ahimsahpuram 8th Street, Sellur, Madurai - 625002",
    links: [], skills: [],
  },
  {
    email: "927625bec280@mkce.ac.in", password: "927625BEC280",
    name: "Sujin Infant Roy J", role: "student", status: "active",
    department: "ECE", year: "II", section: "E", registerNumber: "927625BEC280",
    phone: "9363913436", personalEmail: "sujininfantroy1980@gmail.com",
    alternateEmail: "nelsonroys2019@gmail.com", dateOfBirth: "15-12-2007",
    bloodGroup: "O+ve", address: "138, West Street, Pillaithottam, Muthalagupatty, Dindigul - 624002",
    links: ["https://www.linkedin.com/in/sujin-infant-roy-j-9b44823b9"], skills: [],
  },
  {
    email: "927625bec083@mkce.ac.in", password: "927625BEC083",
    name: "Gowtham N K", role: "student", status: "active",
    department: "ECE", year: "II", section: "B", registerNumber: "927625BEC083",
    phone: "", personalEmail: "", alternateEmail: "", dateOfBirth: "",
    bloodGroup: "", address: "", links: [], skills: [],
  },
];

// ── Create a single user ──────────────────────────────────────
async function createUser(u) {
  const label = `${u.name} (${u.email})`;
  try {
    let uid;
    try {
      const record = await auth.createUser({
        email: u.email, password: u.password, displayName: u.name,
      });
      uid = record.uid;
      console.log(`  ✅ Auth created  → ${label}`);
    } catch (err) {
      if (err.code === "auth/email-already-exists") {
        const existing = await auth.getUserByEmail(u.email);
        uid = existing.uid;
        await auth.updateUser(uid, { password: u.password, displayName: u.name });
        console.log(`  🔄 Auth updated  → ${label}`);
      } else {
        throw err;
      }
    }

    const firestoreDoc = {
      name: u.name, email: u.email, role: u.role, status: u.status,
      department: u.department || "", year: u.year || "", section: u.section || "",
      registerNumber: u.registerNumber || "", rollNumber: u.rollNumber || "",
      phone: u.phone ? u.phone.toString().replace(/\s+/g, "") : "",
      personalEmail: u.personalEmail || "", alternateEmail: u.alternateEmail || "",
      dateOfBirth: u.dateOfBirth || "", bloodGroup: u.bloodGroup || "",
      address: u.address || "", links: u.links || [], skills: u.skills || [],
      createdAt: now, updatedAt: now,
    };

    await db.collection("users").doc(uid).set(firestoreDoc, { merge: true });
    console.log(`  📄 Firestore OK  → ${label}`);
    return { success: true, uid, name: u.name };
  } catch (err) {
    console.error(`  ❌ FAILED        → ${label}: ${err.message}`);
    return { success: false, name: u.name, error: err.message };
  }
}

// ── Main ──────────────────────────────────────────────────────
async function seed() {
  console.log("\n🚀  MentorMesh — Seeding users...\n");
  console.log(`    Total accounts: ${USERS.length}\n`);
  console.log("─".repeat(60));

  const results = { success: [], failed: [] };
  for (const u of USERS) {
    const r = await createUser(u);
    if (r.success) results.success.push(r.name);
    else results.failed.push(r.name);
  }

  console.log("\n" + "─".repeat(60));
  console.log(`\n✅  Success : ${results.success.length}`);
  if (results.failed.length > 0) {
    console.log(`❌  Failed  : ${results.failed.length}`);
    results.failed.forEach((n) => console.log(`     • ${n}`));
  }
  console.log("\n🎉  Done!\n");
  process.exit(0);
}

seed().catch((err) => { console.error("Fatal:", err); process.exit(1); });
