-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('CREATED', 'CLONING', 'CLONED', 'ANALYZING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "repositoryUrl" TEXT NOT NULL,
    "repositoryHost" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'CREATED',
    "branch" TEXT,
    "commitSha" TEXT,
    "workspacePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_repositoryHost_idx" ON "Project"("repositoryHost");
