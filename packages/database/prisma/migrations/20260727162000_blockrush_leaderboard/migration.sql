CREATE TABLE "BlockRushScore" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockRushScore_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BlockRushScore_playerId_key"
ON "BlockRushScore"("playerId");

CREATE INDEX "BlockRushScore_score_idx"
ON "BlockRushScore"("score" DESC);
