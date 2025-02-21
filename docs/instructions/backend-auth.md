### **Full Authentication Setup for Next.js with Google, GitHub, Email & Multi-Tenant Auth on Vercel**
This guide will help you **implement full authentication** in a Next.js SaaS project using **NextAuth.js** and deploy it on **Vercel**.

✅ **Supports**:  
1️⃣ **OAuth** (Google & GitHub)  
2️⃣ **Email/Password Authentication**  
3️⃣ **JWT & Multi-Tenant Authentication**  
4️⃣ **Session-Based & Token-Based Authentication**  

---

## **1️⃣ Why Do We Need a Database for Authentication?**
If you are **only using OAuth (Google, GitHub, etc.)**, you **don’t necessarily need a database** because NextAuth.js can handle authentication **without storing user data manually**.

🚀 **However, for email/password authentication & multi-tenancy, you need a database** to:
- Store **users** (email, password, planType, tenant).
- Track **subscription plans** (Trial, Pro, Enterprise).
- Link **OAuth users with tenant workspaces**.

---

## **2️⃣ Tech Stack**
- **Next.js** → Frontend UI
- **NextAuth.js** → Authentication
- **Prisma (PostgreSQL/Supabase)** → Database for email/tenant storage
- **Vercel** → Deployment

---

## **3️⃣ Install Dependencies**
Run this inside your Next.js project:
```bash
npm install next-auth @next-auth/prisma-adapter bcrypt prisma
```

---

## **4️⃣ Set Up Prisma with Supabase (PostgreSQL)**
Since we need to store users and tenant data, we use **Prisma ORM** with **Supabase**.

### **Step 1: Initialize Prisma**
```bash
npx prisma init
```
This creates a `prisma/schema.prisma` file.

### **Step 2: Define the User & Tenant Models**
Edit `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String  @id @default(uuid())
  email     String  @unique
  password  String?
  name      String?
  image     String?
  provider  String?
  planType  String  @default("Trial") // Trial, Pro, Enterprise
  tenantId  String?
  Tenant    Tenant? @relation(fields: [tenantId], references: [id])
}

model Tenant {
  id    String  @id @default(uuid())
  name  String  @unique
  users User[]
}
```

### **Step 3: Apply Database Migrations**
```bash
npx prisma migrate dev --name init
```

---

## **5️⃣ Setup NextAuth.js for Authentication**
Create a new file: `pages/api/auth/[...nextauth].js`
```javascript
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export default NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "test@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user) throw new Error("No user found!");

        const validPassword = await bcrypt.compare(credentials.password, user.password);
        if (!validPassword) throw new Error("Incorrect password");

        return user;
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      session.user.planType = user.planType;
      session.user.tenantId = user.tenantId;
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
});
```

---

## **6️⃣ Create a Signup Page for Email & Password**
Create `pages/auth/signup.js`:
```javascript
import { useState } from "react";
import { useRouter } from "next/router";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  async function handleSignup(e) {
    e.preventDefault();
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) router.push("/auth/login");
    else alert("Signup failed");
  }

  return (
    <form onSubmit={handleSignup}>
      <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} required />
      <button type="submit">Signup</button>
    </form>
  );
}
```

---

## **7️⃣ Create a Signup API for Email Authentication**
Create `pages/api/auth/signup.js`:
```javascript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, password } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return res.status(400).json({ message: "User already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await prisma.user.create({ data: { email, password: hashedPassword } });

  res.status(201).json({ message: "User created", user: newUser });
}
```

---

## **8️⃣ Deploy to Vercel**
### **Step 1: Install Vercel CLI**
```bash
npm install -g vercel
```

### **Step 2: Set Up Environment Variables**
Run:
```bash
vercel env add
```
Set these:
```
DATABASE_URL=your-supabase-url
NEXTAUTH_SECRET=random-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### **Step 3: Deploy**
```bash
vercel
```

🎉 **Your Next.js authentication system is now live on Vercel!**

---

## **9️⃣ Next Steps**
✅ **Restrict user features based on `planType`**  
✅ **Enable multi-tenant switching (user selects workspace on login)**  
✅ **Connect Stripe for Pro/Enterprise upgrades**  

---

## **🚀 Summary**
- **NextAuth.js handles Google, GitHub, and Email auth**.
- **Prisma + Supabase stores users & tenant info**.
- **JWT & Sessions manage user authentication**.
- **Deployed easily on Vercel**.

Let me know if you need **multi-tenant routing or Stripe integration next!** 🚀