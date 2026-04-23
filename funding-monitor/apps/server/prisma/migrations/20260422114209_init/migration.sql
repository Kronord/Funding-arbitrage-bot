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

-- AddForeignKey
ALTER TABLE "FundingPair" ADD CONSTRAINT "FundingPair_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "FundingSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
