-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('CLEAR', 'ELEVATED', 'CRITICAL');

-- CreateEnum
CREATE TYPE "Access" AS ENUM ('OPEN', 'LOCKED');

-- CreateEnum
CREATE TYPE "ThreatLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "ContactSubmission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organization" TEXT,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "coverLetter" TEXT NOT NULL,
    "cvName" TEXT NOT NULL,
    "cvType" TEXT NOT NULL,
    "cvSize" INTEGER NOT NULL,
    "cvData" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "isPro" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "proUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "periodDays" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL,
    "providerRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "IntelMarker" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'CLEAR',
    "access" "Access" NOT NULL DEFAULT 'OPEN',
    "headline" TEXT,
    "body" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "IntelMarker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT,
    "titleKu" TEXT,
    "descriptionEn" TEXT NOT NULL,
    "descriptionAr" TEXT,
    "descriptionKu" TEXT,
    "icon" TEXT,
    "imageData" BYTEA,
    "imageType" TEXT,
    "imageName" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyReport" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "kurdistanThreat" "ThreatLevel" NOT NULL DEFAULT 'MODERATE',
    "iraqThreat" "ThreatLevel" NOT NULL DEFAULT 'HIGH',
    "politicalKurdistan" TEXT,
    "politicalIraq" TEXT,
    "weather" TEXT,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "DailyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "defaultRegion" TEXT NOT NULL DEFAULT 'IRAQ',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteContent" (
    "id" TEXT NOT NULL DEFAULT 'site',
    "heroEyebrowEn" TEXT NOT NULL,
    "heroEyebrowAr" TEXT,
    "heroEyebrowKu" TEXT,
    "heroTitleEn" TEXT NOT NULL,
    "heroTitleAr" TEXT,
    "heroTitleKu" TEXT,
    "heroSubtitleEn" TEXT NOT NULL,
    "heroSubtitleAr" TEXT,
    "heroSubtitleKu" TEXT,
    "aboutEyebrowEn" TEXT NOT NULL,
    "aboutEyebrowAr" TEXT,
    "aboutEyebrowKu" TEXT,
    "aboutTitleEn" TEXT NOT NULL,
    "aboutTitleAr" TEXT,
    "aboutTitleKu" TEXT,
    "aboutBody1En" TEXT NOT NULL,
    "aboutBody1Ar" TEXT,
    "aboutBody1Ku" TEXT,
    "aboutBody2En" TEXT NOT NULL,
    "aboutBody2Ar" TEXT,
    "aboutBody2Ku" TEXT,
    "aboutBody3En" TEXT NOT NULL,
    "aboutBody3Ar" TEXT,
    "aboutBody3Ku" TEXT,
    "missionTitleEn" TEXT NOT NULL,
    "missionTitleAr" TEXT,
    "missionTitleKu" TEXT,
    "missionBodyEn" TEXT NOT NULL,
    "missionBodyAr" TEXT,
    "missionBodyKu" TEXT,
    "visionTitleEn" TEXT NOT NULL,
    "visionTitleAr" TEXT,
    "visionTitleKu" TEXT,
    "visionBodyEn" TEXT NOT NULL,
    "visionBodyAr" TEXT,
    "visionBodyKu" TEXT,
    "statExperienceValue" TEXT NOT NULL,
    "statExperienceLabelEn" TEXT NOT NULL,
    "statExperienceLabelAr" TEXT,
    "statExperienceLabelKu" TEXT,
    "statPersonnelValue" TEXT NOT NULL,
    "statPersonnelLabelEn" TEXT NOT NULL,
    "statPersonnelLabelAr" TEXT,
    "statPersonnelLabelKu" TEXT,
    "statSitesValue" TEXT NOT NULL,
    "statSitesLabelEn" TEXT NOT NULL,
    "statSitesLabelAr" TEXT,
    "statSitesLabelKu" TEXT,
    "statCoverageValue" TEXT NOT NULL,
    "statCoverageLabelEn" TEXT NOT NULL,
    "statCoverageLabelAr" TEXT,
    "statCoverageLabelKu" TEXT,
    "footerTaglineEn" TEXT NOT NULL,
    "footerTaglineAr" TEXT,
    "footerTaglineKu" TEXT,
    "faqEyebrowEn" TEXT NOT NULL,
    "faqEyebrowAr" TEXT,
    "faqEyebrowKu" TEXT,
    "faqTitleEn" TEXT NOT NULL,
    "faqTitleAr" TEXT,
    "faqTitleKu" TEXT,
    "faqSubtitleEn" TEXT NOT NULL,
    "faqSubtitleAr" TEXT,
    "faqSubtitleKu" TEXT,
    "faqCtaTitleEn" TEXT NOT NULL,
    "faqCtaTitleAr" TEXT,
    "faqCtaTitleKu" TEXT,
    "faqCtaBodyEn" TEXT NOT NULL,
    "faqCtaBodyAr" TEXT,
    "faqCtaBodyKu" TEXT,
    "contactEyebrowEn" TEXT NOT NULL,
    "contactEyebrowAr" TEXT,
    "contactEyebrowKu" TEXT,
    "contactTitleEn" TEXT NOT NULL,
    "contactTitleAr" TEXT,
    "contactTitleKu" TEXT,
    "contactSubtitleEn" TEXT NOT NULL,
    "contactSubtitleAr" TEXT,
    "contactSubtitleKu" TEXT,
    "careersEyebrowEn" TEXT NOT NULL,
    "careersEyebrowAr" TEXT,
    "careersEyebrowKu" TEXT,
    "careersTitleEn" TEXT NOT NULL,
    "careersTitleAr" TEXT,
    "careersTitleKu" TEXT,
    "proEyebrowEn" TEXT NOT NULL,
    "proEyebrowAr" TEXT,
    "proEyebrowKu" TEXT,
    "proTitleEn" TEXT NOT NULL,
    "proTitleAr" TEXT,
    "proTitleKu" TEXT,
    "proSubtitleEn" TEXT NOT NULL,
    "proSubtitleAr" TEXT,
    "proSubtitleKu" TEXT,
    "planMonthlyNameEn" TEXT NOT NULL,
    "planMonthlyNameAr" TEXT,
    "planMonthlyNameKu" TEXT,
    "planMonthlyPeriodEn" TEXT NOT NULL,
    "planMonthlyPeriodAr" TEXT,
    "planMonthlyPeriodKu" TEXT,
    "planMonthlyBlurbEn" TEXT NOT NULL,
    "planMonthlyBlurbAr" TEXT,
    "planMonthlyBlurbKu" TEXT,
    "planYearlyNameEn" TEXT NOT NULL,
    "planYearlyNameAr" TEXT,
    "planYearlyNameKu" TEXT,
    "planYearlyPeriodEn" TEXT NOT NULL,
    "planYearlyPeriodAr" TEXT,
    "planYearlyPeriodKu" TEXT,
    "planYearlyBlurbEn" TEXT NOT NULL,
    "planYearlyBlurbAr" TEXT,
    "planYearlyBlurbKu" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaqItem" (
    "id" TEXT NOT NULL,
    "questionEn" TEXT NOT NULL,
    "questionAr" TEXT,
    "questionKu" TEXT,
    "answerEn" TEXT NOT NULL,
    "answerAr" TEXT,
    "answerKu" TEXT,
    "listEn" JSONB,
    "listAr" JSONB,
    "listKu" JSONB,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerBenefit" (
    "id" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT,
    "titleKu" TEXT,
    "bodyEn" TEXT NOT NULL,
    "bodyAr" TEXT,
    "bodyKu" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerBenefit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "category" TEXT NOT NULL,
    "imageData" BYTEA,
    "imageType" TEXT,
    "imageName" TEXT,
    "w" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "cx" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "cy" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobApplication_createdAt_idx" ON "JobApplication"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Order_providerRef_key" ON "Order"("providerRef");

-- CreateIndex
CREATE INDEX "Order_userId_status_idx" ON "Order"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "IntelMarker_published_severity_idx" ON "IntelMarker"("published", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- CreateIndex
CREATE INDEX "Service_published_sortOrder_idx" ON "Service"("published", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "DailyReport_date_key" ON "DailyReport"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ReportSource_url_key" ON "ReportSource"("url");

-- CreateIndex
CREATE INDEX "ReportSource_createdAt_idx" ON "ReportSource"("createdAt");

-- CreateIndex
CREATE INDEX "FaqItem_published_sortOrder_idx" ON "FaqItem"("published", "sortOrder");

-- CreateIndex
CREATE INDEX "CareerBenefit_published_sortOrder_idx" ON "CareerBenefit"("published", "sortOrder");

-- CreateIndex
CREATE INDEX "Client_published_sortOrder_idx" ON "Client"("published", "sortOrder");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntelMarker" ADD CONSTRAINT "IntelMarker_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyReport" ADD CONSTRAINT "DailyReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
