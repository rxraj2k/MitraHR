-- CreateTable: Quiz (one per TrainingCourse)
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Knowledge Check',
    "passPercent" INTEGER NOT NULL DEFAULT 70,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Quiz_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "TrainingCourse" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Quiz_courseId_key" ON "Quiz"("courseId");

-- CreateTable: QuizQuestion
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quizId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: QuizOption
CREATE TABLE "QuizOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "QuizOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: QuizAttempt
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quizId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "totalQuestions" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "incorrectCount" INTEGER NOT NULL,
    "percent" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuizAttempt_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: QuizAttemptAnswer
CREATE TABLE "QuizAttemptAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionId" TEXT,
    "isCorrect" BOOLEAN NOT NULL,
    CONSTRAINT "QuizAttemptAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuizAttemptAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuizAttemptAnswer_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "QuizOption" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Seed: demo quizzes for one flagship course per track (Mandatory/DevOps/IAM),
-- end-to-end proof of the Testing/Assessment feature. Bulk-authoring a quiz for
-- every remaining course is left to Manage Tests in the app (Learning Center >
-- Tests > Manage Tests), since writing genuinely correct subject-matter
-- questions for ~80 third-party courses isn't something to fabricate wholesale.
--
-- Every insert below is SELECT-driven off its parent row (TrainingCourse ->
-- Quiz -> QuizQuestion -> QuizOption) instead of a bare VALUES literal, so it
-- is a no-op (inserts 0 rows) against the empty shadow database Prisma builds
-- to validate migration history, and only actually seeds data against a real
-- database where TrainingCourse rows already exist (they're seeded by
-- seed.ts/seed-iam-courses.ts/seed-devops-courses.ts, outside migration history).

INSERT INTO "Quiz" ("id", "courseId", "title", "passPercent", "active", "updatedAt")
SELECT '8e92b2b4-385f-4b96-acd6-c806ca1dc4e8', tc.id, 'Phishing Awareness Knowledge Check', 70, 1, CURRENT_TIMESTAMP
FROM "TrainingCourse" tc WHERE tc.id = 'c1d645b6-6adb-4b2b-bd37-e03a560ba516';
INSERT INTO "QuizQuestion" ("id", "quizId", "text", "order")
SELECT '71e7b73d-29e7-4bf2-8285-8c53981e6c39', q.id, 'What is phishing?', 0
FROM "Quiz" q WHERE q.id = '8e92b2b4-385f-4b96-acd6-c806ca1dc4e8';
INSERT INTO "QuizOption" ("id", "questionId", "text", "isCorrect", "order")
SELECT '8aad8937-79c1-4634-b3d2-320318e7e513', qq.id, 'A social engineering attack that tricks users into revealing sensitive information', 1, 0 FROM "QuizQuestion" qq WHERE qq.id = '71e7b73d-29e7-4bf2-8285-8c53981e6c39'
UNION ALL
SELECT '7914daa1-4ab6-43a3-89e4-12ed5b844843', qq.id, 'A type of computer virus that self-replicates', 0, 1 FROM "QuizQuestion" qq WHERE qq.id = '71e7b73d-29e7-4bf2-8285-8c53981e6c39'
UNION ALL
SELECT '9f5dc064-19d9-4867-947b-db67cd8a233d', qq.id, 'A method for encrypting files for ransom', 0, 2 FROM "QuizQuestion" qq WHERE qq.id = '71e7b73d-29e7-4bf2-8285-8c53981e6c39'
UNION ALL
SELECT 'd8367f09-8fd1-4c89-8056-16ec79b23dc5', qq.id, 'A network protocol for secure file transfer', 0, 3 FROM "QuizQuestion" qq WHERE qq.id = '71e7b73d-29e7-4bf2-8285-8c53981e6c39';
INSERT INTO "QuizQuestion" ("id", "quizId", "text", "order")
SELECT '410832a6-9932-4a67-aaf2-e279d7d05100', q.id, 'Which of these is a common red flag of a phishing email?', 1
FROM "Quiz" q WHERE q.id = '8e92b2b4-385f-4b96-acd6-c806ca1dc4e8';
INSERT INTO "QuizOption" ("id", "questionId", "text", "isCorrect", "order")
SELECT 'd04d41a1-257b-4e33-8645-52aaa2c328be', qq.id, 'Urgent language pressuring immediate action', 1, 0 FROM "QuizQuestion" qq WHERE qq.id = '410832a6-9932-4a67-aaf2-e279d7d05100'
UNION ALL
SELECT '879923e0-ca5a-44f5-88e6-765d1272490b', qq.id, 'The email is signed with the sender''s full name', 0, 1 FROM "QuizQuestion" qq WHERE qq.id = '410832a6-9932-4a67-aaf2-e279d7d05100'
UNION ALL
SELECT 'edf92d96-50ce-4e05-a298-22038986d1d7', qq.id, 'It was sent during business hours', 0, 2 FROM "QuizQuestion" qq WHERE qq.id = '410832a6-9932-4a67-aaf2-e279d7d05100'
UNION ALL
SELECT '126711b7-4ad8-4cf2-8c94-ba53230725bd', qq.id, 'It contains a company logo', 0, 3 FROM "QuizQuestion" qq WHERE qq.id = '410832a6-9932-4a67-aaf2-e279d7d05100';
INSERT INTO "QuizQuestion" ("id", "quizId", "text", "order")
SELECT 'ad520493-8603-4968-b899-b5b6228fe1ad', q.id, 'What should you do if you receive a suspicious email asking for your password?', 2
FROM "Quiz" q WHERE q.id = '8e92b2b4-385f-4b96-acd6-c806ca1dc4e8';
INSERT INTO "QuizOption" ("id", "questionId", "text", "isCorrect", "order")
SELECT '946f8342-703b-4c72-87c9-91f7e711f02a', qq.id, 'Report it to IT/Security and do not click any links', 1, 0 FROM "QuizQuestion" qq WHERE qq.id = 'ad520493-8603-4968-b899-b5b6228fe1ad'
UNION ALL
SELECT '385f624c-2696-4d93-ad06-3868d71ed656', qq.id, 'Reply to the sender asking for verification', 0, 1 FROM "QuizQuestion" qq WHERE qq.id = 'ad520493-8603-4968-b899-b5b6228fe1ad'
UNION ALL
SELECT '9d08429c-6f9f-4a6d-a3fd-67106469a849', qq.id, 'Forward it to a coworker for their opinion', 0, 2 FROM "QuizQuestion" qq WHERE qq.id = 'ad520493-8603-4968-b899-b5b6228fe1ad'
UNION ALL
SELECT 'e83dee4a-3198-4a5a-8595-1b1239ec5ef1', qq.id, 'Enter your password to test if the link works', 0, 3 FROM "QuizQuestion" qq WHERE qq.id = 'ad520493-8603-4968-b899-b5b6228fe1ad';
INSERT INTO "QuizQuestion" ("id", "quizId", "text", "order")
SELECT '920fe4ae-6490-4873-ad8a-3684f92b8306', q.id, 'What is "spear phishing"?', 3
FROM "Quiz" q WHERE q.id = '8e92b2b4-385f-4b96-acd6-c806ca1dc4e8';
INSERT INTO "QuizOption" ("id", "questionId", "text", "isCorrect", "order")
SELECT '287520c5-abfd-4b79-a76c-618f5752aae3', qq.id, 'A phishing attack targeted at a specific individual or organization', 1, 0 FROM "QuizQuestion" qq WHERE qq.id = '920fe4ae-6490-4873-ad8a-3684f92b8306'
UNION ALL
SELECT 'a66955f2-c3ab-48d9-9dbb-cd150113d479', qq.id, 'A phishing attack sent to millions of random users', 0, 1 FROM "QuizQuestion" qq WHERE qq.id = '920fe4ae-6490-4873-ad8a-3684f92b8306'
UNION ALL
SELECT '0433de73-79f8-405d-a6f1-de4f240dc076', qq.id, 'A virus that spreads through USB drives', 0, 2 FROM "QuizQuestion" qq WHERE qq.id = '920fe4ae-6490-4873-ad8a-3684f92b8306'
UNION ALL
SELECT 'e349721c-9750-4305-9c95-d92737a43e5c', qq.id, 'A firewall bypass technique', 0, 3 FROM "QuizQuestion" qq WHERE qq.id = '920fe4ae-6490-4873-ad8a-3684f92b8306';
INSERT INTO "QuizQuestion" ("id", "quizId", "text", "order")
SELECT 'aaed0e89-4f15-4997-ac43-507f1d3e7504', q.id, 'Which of the following is the safest way to verify a link before clicking?', 4
FROM "Quiz" q WHERE q.id = '8e92b2b4-385f-4b96-acd6-c806ca1dc4e8';
INSERT INTO "QuizOption" ("id", "questionId", "text", "isCorrect", "order")
SELECT '5078b298-a44e-47aa-8ca9-bc1097972a78', qq.id, 'Hover over the link to preview the actual URL', 1, 0 FROM "QuizQuestion" qq WHERE qq.id = 'aaed0e89-4f15-4997-ac43-507f1d3e7504'
UNION ALL
SELECT '411fb996-dcb2-439c-9853-7e180d437adf', qq.id, 'Click it and see where it goes', 0, 1 FROM "QuizQuestion" qq WHERE qq.id = 'aaed0e89-4f15-4997-ac43-507f1d3e7504'
UNION ALL
SELECT '9f0e93c0-a99a-47e2-91d7-b60cbe5ce989', qq.id, 'Ask a friend outside the company', 0, 2 FROM "QuizQuestion" qq WHERE qq.id = 'aaed0e89-4f15-4997-ac43-507f1d3e7504'
UNION ALL
SELECT '8b0939ef-7ad0-4114-be72-85054a167d97', qq.id, 'Assume it''s safe if it looks official', 0, 3 FROM "QuizQuestion" qq WHERE qq.id = 'aaed0e89-4f15-4997-ac43-507f1d3e7504';

INSERT INTO "Quiz" ("id", "courseId", "title", "passPercent", "active", "updatedAt")
SELECT 'ae326778-1e34-4447-9eb7-940dc54aa429', tc.id, 'Agile & Scrum/Kanban Knowledge Check', 70, 1, CURRENT_TIMESTAMP
FROM "TrainingCourse" tc WHERE tc.id = '8b3b24b6-c3ae-41c6-bdd6-0d27fc8ddf3f';
INSERT INTO "QuizQuestion" ("id", "quizId", "text", "order")
SELECT '6921017a-655b-4918-bfd5-bb072ab2a60a', q.id, 'In Scrum, what is the typical length of a Sprint?', 0
FROM "Quiz" q WHERE q.id = 'ae326778-1e34-4447-9eb7-940dc54aa429';
INSERT INTO "QuizOption" ("id", "questionId", "text", "isCorrect", "order")
SELECT '18986045-b443-4fa6-bf94-7e89249aedf8', qq.id, '1 to 4 weeks', 1, 0 FROM "QuizQuestion" qq WHERE qq.id = '6921017a-655b-4918-bfd5-bb072ab2a60a'
UNION ALL
SELECT '7d262019-b682-47c6-9067-2281ae6ab2e8', qq.id, '6 months', 0, 1 FROM "QuizQuestion" qq WHERE qq.id = '6921017a-655b-4918-bfd5-bb072ab2a60a'
UNION ALL
SELECT 'be7f5bc3-abd3-4a20-a5d3-5d7874ac21c5', qq.id, '1 day', 0, 2 FROM "QuizQuestion" qq WHERE qq.id = '6921017a-655b-4918-bfd5-bb072ab2a60a'
UNION ALL
SELECT '4e456f99-0297-48e5-aa62-ba359376cf88', qq.id, '1 year', 0, 3 FROM "QuizQuestion" qq WHERE qq.id = '6921017a-655b-4918-bfd5-bb072ab2a60a';
INSERT INTO "QuizQuestion" ("id", "quizId", "text", "order")
SELECT 'f6e937f0-2e94-4668-99ce-3afdf14d8ce0', q.id, 'Who is responsible for maximizing the value of the product in Scrum?', 1
FROM "Quiz" q WHERE q.id = 'ae326778-1e34-4447-9eb7-940dc54aa429';
INSERT INTO "QuizOption" ("id", "questionId", "text", "isCorrect", "order")
SELECT '72ef4e19-0c1d-4f8f-a8ec-229d58a92ece', qq.id, 'Product Owner', 1, 0 FROM "QuizQuestion" qq WHERE qq.id = 'f6e937f0-2e94-4668-99ce-3afdf14d8ce0'
UNION ALL
SELECT '5b5925c7-7eb5-41a8-afdf-1c42e0794b7a', qq.id, 'Scrum Master', 0, 1 FROM "QuizQuestion" qq WHERE qq.id = 'f6e937f0-2e94-4668-99ce-3afdf14d8ce0'
UNION ALL
SELECT 'a76bf7ab-5a3c-4bc4-b48a-8720bc145e33', qq.id, 'QA Tester', 0, 2 FROM "QuizQuestion" qq WHERE qq.id = 'f6e937f0-2e94-4668-99ce-3afdf14d8ce0'
UNION ALL
SELECT 'ad68e2ba-2811-40f0-805b-20b5aa3b4ddf', qq.id, 'Project Sponsor', 0, 3 FROM "QuizQuestion" qq WHERE qq.id = 'f6e937f0-2e94-4668-99ce-3afdf14d8ce0';
INSERT INTO "QuizQuestion" ("id", "quizId", "text", "order")
SELECT 'cdaf4ff5-25fa-4cfa-b396-9bf94ae2c728', q.id, 'What is the main purpose of a Daily Standup (Daily Scrum)?', 2
FROM "Quiz" q WHERE q.id = 'ae326778-1e34-4447-9eb7-940dc54aa429';
INSERT INTO "QuizOption" ("id", "questionId", "text", "isCorrect", "order")
SELECT 'ec919446-d5c3-48f1-9316-b51a34e06f6e', qq.id, 'To synchronize the team on progress and identify blockers', 1, 0 FROM "QuizQuestion" qq WHERE qq.id = 'cdaf4ff5-25fa-4cfa-b396-9bf94ae2c728'
UNION ALL
SELECT 'e931dc61-b701-4a38-8726-b1e56051d4c3', qq.id, 'To assign new tasks for the entire month', 0, 1 FROM "QuizQuestion" qq WHERE qq.id = 'cdaf4ff5-25fa-4cfa-b396-9bf94ae2c728'
UNION ALL
SELECT '868a94ca-c892-43ea-b0b9-fb08f7a1e52e', qq.id, 'To conduct a formal performance review', 0, 2 FROM "QuizQuestion" qq WHERE qq.id = 'cdaf4ff5-25fa-4cfa-b396-9bf94ae2c728'
UNION ALL
SELECT '0eac6c3b-d64d-4350-b4a6-40a7685d660c', qq.id, 'To finalize the product roadmap', 0, 3 FROM "QuizQuestion" qq WHERE qq.id = 'cdaf4ff5-25fa-4cfa-b396-9bf94ae2c728';
INSERT INTO "QuizQuestion" ("id", "quizId", "text", "order")
SELECT 'ddde48d8-9550-491c-ad4e-05dc47fb11cb', q.id, 'In Kanban, what does "WIP limit" stand for?', 3
FROM "Quiz" q WHERE q.id = 'ae326778-1e34-4447-9eb7-940dc54aa429';
INSERT INTO "QuizOption" ("id", "questionId", "text", "isCorrect", "order")
SELECT '3908b77f-f2ac-483a-9ab4-8627b98392dd', qq.id, 'Work In Progress limit', 1, 0 FROM "QuizQuestion" qq WHERE qq.id = 'ddde48d8-9550-491c-ad4e-05dc47fb11cb'
UNION ALL
SELECT 'c64ebb80-48e7-44aa-846d-c0bfcdeb87c8', qq.id, 'Weekly Iteration Plan', 0, 1 FROM "QuizQuestion" qq WHERE qq.id = 'ddde48d8-9550-491c-ad4e-05dc47fb11cb'
UNION ALL
SELECT 'c7737c32-7a88-4e4b-bafc-4549d7f4416c', qq.id, 'Workflow Integration Point', 0, 2 FROM "QuizQuestion" qq WHERE qq.id = 'ddde48d8-9550-491c-ad4e-05dc47fb11cb'
UNION ALL
SELECT '9ec84bb0-2765-4a94-9b9e-a9e555fa9c05', qq.id, 'Work Item Priority', 0, 3 FROM "QuizQuestion" qq WHERE qq.id = 'ddde48d8-9550-491c-ad4e-05dc47fb11cb';
INSERT INTO "QuizQuestion" ("id", "quizId", "text", "order")
SELECT '3ed56a7a-ecd2-4b82-9a87-2a65a5a5f9e3', q.id, 'Which artifact in Scrum represents the list of features/requirements to be delivered?', 4
FROM "Quiz" q WHERE q.id = 'ae326778-1e34-4447-9eb7-940dc54aa429';
INSERT INTO "QuizOption" ("id", "questionId", "text", "isCorrect", "order")
SELECT 'd2fae1ee-27c3-4d4d-92ca-b9a096173aca', qq.id, 'Product Backlog', 1, 0 FROM "QuizQuestion" qq WHERE qq.id = '3ed56a7a-ecd2-4b82-9a87-2a65a5a5f9e3'
UNION ALL
SELECT '560023de-875d-472b-9e5b-793b2c1f3ac8', qq.id, 'Sprint Retrospective', 0, 1 FROM "QuizQuestion" qq WHERE qq.id = '3ed56a7a-ecd2-4b82-9a87-2a65a5a5f9e3'
UNION ALL
SELECT '79582757-bcfe-4962-a9ae-bc95486a6df7', qq.id, 'Burnup Report', 0, 2 FROM "QuizQuestion" qq WHERE qq.id = '3ed56a7a-ecd2-4b82-9a87-2a65a5a5f9e3'
UNION ALL
SELECT 'a8a428e7-5d1a-4df4-bcba-3aadf6fa18d6', qq.id, 'Definition of Ready', 0, 3 FROM "QuizQuestion" qq WHERE qq.id = '3ed56a7a-ecd2-4b82-9a87-2a65a5a5f9e3';

INSERT INTO "Quiz" ("id", "courseId", "title", "passPercent", "active", "updatedAt")
SELECT 'd7a48e74-4cb1-4815-aa18-b63e331b287f', tc.id, 'Identity & Access Management Knowledge Check', 70, 1, CURRENT_TIMESTAMP
FROM "TrainingCourse" tc WHERE tc.id = '8534ddc2-2b1b-4dd8-93d5-ebcb4b163edd';
INSERT INTO "QuizQuestion" ("id", "quizId", "text", "order")
SELECT '37b8572f-445f-4006-977b-d356c05018a1', q.id, 'What does "MFA" stand for in IAM?', 0
FROM "Quiz" q WHERE q.id = 'd7a48e74-4cb1-4815-aa18-b63e331b287f';
INSERT INTO "QuizOption" ("id", "questionId", "text", "isCorrect", "order")
SELECT 'cc96c6c4-beeb-41e0-9018-b2d3743ff08f', qq.id, 'Multi-Factor Authentication', 1, 0 FROM "QuizQuestion" qq WHERE qq.id = '37b8572f-445f-4006-977b-d356c05018a1'
UNION ALL
SELECT 'bc7a922f-62e6-4e44-8ba5-c78c935c38fe', qq.id, 'Managed File Access', 0, 1 FROM "QuizQuestion" qq WHERE qq.id = '37b8572f-445f-4006-977b-d356c05018a1'
UNION ALL
SELECT '9003892d-bc8e-49c0-a326-bf3fbfe5f38b', qq.id, 'Multiple Failed Attempts', 0, 2 FROM "QuizQuestion" qq WHERE qq.id = '37b8572f-445f-4006-977b-d356c05018a1'
UNION ALL
SELECT '20f7c5d7-a902-4736-811d-71be5e534611', qq.id, 'Master File Authorization', 0, 3 FROM "QuizQuestion" qq WHERE qq.id = '37b8572f-445f-4006-977b-d356c05018a1';
INSERT INTO "QuizQuestion" ("id", "quizId", "text", "order")
SELECT '9063b179-918c-4a58-8eb1-e17569fe580b', q.id, 'What is the principle of "least privilege"?', 1
FROM "Quiz" q WHERE q.id = 'd7a48e74-4cb1-4815-aa18-b63e331b287f';
INSERT INTO "QuizOption" ("id", "questionId", "text", "isCorrect", "order")
SELECT '9f84ec11-33d1-44a2-bd3c-fea670deca55', qq.id, 'Users should be given only the access necessary to perform their job', 1, 0 FROM "QuizQuestion" qq WHERE qq.id = '9063b179-918c-4a58-8eb1-e17569fe580b'
UNION ALL
SELECT 'd76cabae-0ac0-4147-9238-558531669488', qq.id, 'All users should have administrator access by default', 0, 1 FROM "QuizQuestion" qq WHERE qq.id = '9063b179-918c-4a58-8eb1-e17569fe580b'
UNION ALL
SELECT 'c4a2829c-cc54-4459-9209-2609f9cdab4a', qq.id, 'Access should never be reviewed once granted', 0, 2 FROM "QuizQuestion" qq WHERE qq.id = '9063b179-918c-4a58-8eb1-e17569fe580b'
UNION ALL
SELECT '50f7783e-8908-4abd-8bfb-01e6816d3100', qq.id, 'Passwords should be as short as possible', 0, 3 FROM "QuizQuestion" qq WHERE qq.id = '9063b179-918c-4a58-8eb1-e17569fe580b';
INSERT INTO "QuizQuestion" ("id", "quizId", "text", "order")
SELECT '42c34856-55c4-4191-9432-4ab0f15226cb', q.id, 'What does SSO (Single Sign-On) allow users to do?', 2
FROM "Quiz" q WHERE q.id = 'd7a48e74-4cb1-4815-aa18-b63e331b287f';
INSERT INTO "QuizOption" ("id", "questionId", "text", "isCorrect", "order")
SELECT 'a1537b98-5faa-4513-80b4-1de7f518510a', qq.id, 'Access multiple applications with a single set of login credentials', 1, 0 FROM "QuizQuestion" qq WHERE qq.id = '42c34856-55c4-4191-9432-4ab0f15226cb'
UNION ALL
SELECT '6985d686-251c-4e1a-8552-c957d7181b9c', qq.id, 'Reset their password without verification', 0, 1 FROM "QuizQuestion" qq WHERE qq.id = '42c34856-55c4-4191-9432-4ab0f15226cb'
UNION ALL
SELECT 'dd9ad74f-66a7-425e-a168-cb405272fc27', qq.id, 'Bypass multi-factor authentication', 0, 2 FROM "QuizQuestion" qq WHERE qq.id = '42c34856-55c4-4191-9432-4ab0f15226cb'
UNION ALL
SELECT 'f623be1c-3589-411f-bde1-2ae7d0a75e4a', qq.id, 'Share their password with teammates securely', 0, 3 FROM "QuizQuestion" qq WHERE qq.id = '42c34856-55c4-4191-9432-4ab0f15226cb';
INSERT INTO "QuizQuestion" ("id", "quizId", "text", "order")
SELECT '120a8223-9db0-4d51-b81a-9198a704bda2', q.id, 'What is RBAC (Role-Based Access Control)?', 3
FROM "Quiz" q WHERE q.id = 'd7a48e74-4cb1-4815-aa18-b63e331b287f';
INSERT INTO "QuizOption" ("id", "questionId", "text", "isCorrect", "order")
SELECT '39609cff-9ded-40e4-8f09-5b9a72d0543f', qq.id, 'Assigning permissions to users based on their role within an organization', 1, 0 FROM "QuizQuestion" qq WHERE qq.id = '120a8223-9db0-4d51-b81a-9198a704bda2'
UNION ALL
SELECT 'db1b485d-f1a4-4829-96dc-197cd1d2863a', qq.id, 'A method of encrypting network traffic', 0, 1 FROM "QuizQuestion" qq WHERE qq.id = '120a8223-9db0-4d51-b81a-9198a704bda2'
UNION ALL
SELECT 'ec8f8d05-6cd7-440e-8931-50c7afd2d4a9', qq.id, 'A type of biometric authentication', 0, 2 FROM "QuizQuestion" qq WHERE qq.id = '120a8223-9db0-4d51-b81a-9198a704bda2'
UNION ALL
SELECT 'bd14791e-cab5-452b-b63a-eaf88bb6e8ef', qq.id, 'A password complexity requirement', 0, 3 FROM "QuizQuestion" qq WHERE qq.id = '120a8223-9db0-4d51-b81a-9198a704bda2';
INSERT INTO "QuizQuestion" ("id", "quizId", "text", "order")
SELECT '1c8b400c-6938-4ffb-9b8c-777cb25f394a', q.id, 'What is the purpose of periodic "access reviews" in IAM?', 4
FROM "Quiz" q WHERE q.id = 'd7a48e74-4cb1-4815-aa18-b63e331b287f';
INSERT INTO "QuizOption" ("id", "questionId", "text", "isCorrect", "order")
SELECT 'b3d3287e-1644-41a7-91bb-e6f11637c7b8', qq.id, 'To ensure users only retain access they still need', 1, 0 FROM "QuizQuestion" qq WHERE qq.id = '1c8b400c-6938-4ffb-9b8c-777cb25f394a'
UNION ALL
SELECT '0bc051ea-5723-41bf-9409-1e0f1c0a61d6', qq.id, 'To reset everyone''s password on a schedule', 0, 1 FROM "QuizQuestion" qq WHERE qq.id = '1c8b400c-6938-4ffb-9b8c-777cb25f394a'
UNION ALL
SELECT 'bf1ddc44-c0a8-484a-8840-ab05590c9a40', qq.id, 'To increase the number of admin accounts', 0, 2 FROM "QuizQuestion" qq WHERE qq.id = '1c8b400c-6938-4ffb-9b8c-777cb25f394a'
UNION ALL
SELECT '47051b1f-8e3d-4047-8edd-642daf17a10a', qq.id, 'To disable multi-factor authentication temporarily', 0, 3 FROM "QuizQuestion" qq WHERE qq.id = '1c8b400c-6938-4ffb-9b8c-777cb25f394a';
