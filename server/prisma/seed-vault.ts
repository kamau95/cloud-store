import { PrismaClient, Provider } from "@prisma/client";

const prisma = new PrismaClient();

const credentials = [
  { provider: Provider.AWS, email: "aws-dev-1@example.com", password: "aws-password-1", accessKey: "AKIAIOSFODNN7EXAMPLE", secretKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", region: "us-east-1", specs: { credits: 100, services: ["EC2", "S3"] } },
  { provider: Provider.AWS, email: "aws-dev-2@example.com", password: "aws-password-2", accessKey: "AKIAI44QH8DHBEXAMPLE", secretKey: "je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY", region: "us-east-1", specs: { credits: 100, services: ["EC2", "S3"] } },
  { provider: Provider.AWS, email: "aws-prod-1@example.com", password: "aws-prod-password", accessKey: "AKIAEXAMPLEPRODKEY1", secretKey: "prodSecretKeyExample123", region: "us-east-1", specs: { credits: 500, services: ["EC2", "S3", "RDS", "Lambda", "ECS", "EKS"] } },
  { provider: Provider.GCP, email: "gcp-starter-1@example.com", password: "gcp-password-1", accessKey: "gcp-access-key-1", secretKey: "gcp-secret-key-1", region: "us-central1", specs: { credits: 200, services: ["Compute Engine", "Cloud Storage"] } },
  { provider: Provider.GCP, email: "gcp-starter-2@example.com", password: "gcp-password-2", accessKey: "gcp-access-key-2", secretKey: "gcp-secret-key-2", region: "us-central1", specs: { credits: 200, services: ["Compute Engine", "Cloud Storage"] } },
  { provider: Provider.AZURE, email: "azure-dev-1@example.com", password: "azure-password-1", region: "eastus", specs: { credits: 150, services: ["VMs", "Blob Storage"] } },
  { provider: Provider.AZURE, email: "azure-dev-2@example.com", password: "azure-password-2", region: "eastus", specs: { credits: 150, services: ["VMs", "Blob Storage"] } },
];

async function seed() {
  for (const cred of credentials) {
    await prisma.credential.create({ data: cred });
    console.log(`Stored ${cred.provider} credential: ${cred.email}`);
  }
  console.log("Vault seed complete");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
