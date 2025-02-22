-- Step 1: Rename TestCase table to UseCase
ALTER TABLE "TestCase" RENAME TO "UseCase";

-- Step 2: Update foreign key references in Execution table
ALTER TABLE "Execution" RENAME COLUMN "testcaseId" TO "usecaseId";
ALTER TABLE "Execution" DROP CONSTRAINT IF EXISTS "Execution_testcaseId_fkey";
ALTER TABLE "Execution" ADD CONSTRAINT "Execution_usecaseId_fkey" 
  FOREIGN KEY ("usecaseId") REFERENCES "UseCase"(id);

-- Step 3: Update existing TestCase records to have shortId
UPDATE "TestCase"
SET "shortId" = 'TC-' || LPAD(id::text, 6, '0')
WHERE "shortId" IS NULL;

-- Step 4: Rename the relation in Project table
ALTER TABLE "Project" RENAME COLUMN "testcases" TO "usecases"; 