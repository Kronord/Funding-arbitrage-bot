-- CreateTable
CREATE TABLE "FundingSnapshot" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderSize" DOUBLE PRECISION NOT NULL,
    "exchange" TEXT NOT NULL DEFAULT 'kucoin',

    CONSTRAINT "FundingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingPair" (
    "id" SERIAL NOT NULL,
    "snapshotId" INTEGER NOT NULL,
    "coin" TEXT NOT NULL,
    "exchange" TEXT NOT NULL DEFAULT 'kucoin',
    "funding" DOUBLE PRECISION NOT NULL,
    "intervalHours" DOUBLE PRECISION NOT NULL,
    "nextFundingTs" BIGINT,
    "nextFundingTime" TEXT,
    "minutesUntil" INTEGER,
    "basisReal" DOUBLE PRECISION NOT NULL,
    "net" DOUBLE PRECISION NOT NULL,
    "avgSpotBuy" TEXT NOT NULL,
    "avgFutSell" TEXT NOT NULL,

    CONSTRAINT "FundingPair_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingHistory" (
    "id" SERIAL NOT NULL,
    "coin" TEXT NOT NULL,
    "exchange" TEXT NOT NULL DEFAULT 'kucoin',
    "rate" DOUBLE PRECISION NOT NULL,
    "timepoint" BIGINT NOT NULL,
    "timeStr" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kline" (
    "id" SERIAL NOT NULL,
    "coin" TEXT NOT NULL,
    "exchange" TEXT NOT NULL DEFAULT 'kucoin',
    "granularity" INTEGER NOT NULL,
    "time" BIGINT NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Kline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractDetail" (
    "id" SERIAL NOT NULL,
    "coin" TEXT NOT NULL,
    "exchange" TEXT NOT NULL DEFAULT 'kucoin',
    "symbol" TEXT NOT NULL,
    "markPrice" DOUBLE PRECISION NOT NULL,
    "indexPrice" DOUBLE PRECISION NOT NULL,
    "funding" DOUBLE PRECISION,
    "intervalHours" DOUBLE PRECISION NOT NULL,
    "nextFundingTs" BIGINT,
    "nextFundingTime" TEXT,
    "minutesUntil" INTEGER,
    "maxLeverage" DOUBLE PRECISION,
    "takerFeeRate" DOUBLE PRECISION,
    "makerFeeRate" DOUBLE PRECISION,
    "openInterest" DOUBLE PRECISION,
    "volume24h" DOUBLE PRECISION,
    "turnover24h" DOUBLE PRECISION,
    "asksJson" TEXT NOT NULL,
    "bidsJson" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT,
    "avatarUrl" TEXT,
    "googleId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "deviceFingerprint" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationMeta" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistrationMeta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationAttempt" (
    "id" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistrationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FundingSnapshot_createdAt_idx" ON "FundingSnapshot"("createdAt");

-- CreateIndex
CREATE INDEX "FundingPair_coin_idx" ON "FundingPair"("coin");

-- CreateIndex
CREATE INDEX "FundingPair_snapshotId_idx" ON "FundingPair"("snapshotId");

-- CreateIndex
CREATE INDEX "FundingHistory_coin_exchange_idx" ON "FundingHistory"("coin", "exchange");

-- CreateIndex
CREATE INDEX "FundingHistory_timepoint_idx" ON "FundingHistory"("timepoint");

-- CreateIndex
CREATE UNIQUE INDEX "FundingHistory_coin_exchange_timepoint_key" ON "FundingHistory"("coin", "exchange", "timepoint");

-- CreateIndex
CREATE INDEX "Kline_coin_exchange_granularity_idx" ON "Kline"("coin", "exchange", "granularity");

-- CreateIndex
CREATE UNIQUE INDEX "Kline_coin_exchange_granularity_time_key" ON "Kline"("coin", "exchange", "granularity", "time");

-- CreateIndex
CREATE INDEX "ContractDetail_coin_idx" ON "ContractDetail"("coin");

-- CreateIndex
CREATE UNIQUE INDEX "ContractDetail_coin_exchange_key" ON "ContractDetail"("coin", "exchange");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_googleId_idx" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_refreshTokenHash_key" ON "Session"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_refreshTokenHash_idx" ON "Session"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationMeta_userId_key" ON "RegistrationMeta"("userId");

-- CreateIndex
CREATE INDEX "RegistrationMeta_ipHash_idx" ON "RegistrationMeta"("ipHash");

-- CreateIndex
CREATE INDEX "RegistrationAttempt_ipHash_idx" ON "RegistrationAttempt"("ipHash");

-- CreateIndex
CREATE INDEX "RegistrationAttempt_createdAt_idx" ON "RegistrationAttempt"("createdAt");

-- AddForeignKey
ALTER TABLE "FundingPair" ADD CONSTRAINT "FundingPair_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "FundingSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationMeta" ADD CONSTRAINT "RegistrationMeta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
