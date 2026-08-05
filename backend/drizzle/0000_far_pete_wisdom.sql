CREATE TABLE "candles" (
	"id" serial PRIMARY KEY NOT NULL,
	"market_pubkey" varchar(44),
	"resolution" varchar(5) NOT NULL,
	"time" timestamp NOT NULL,
	"open" numeric NOT NULL,
	"high" numeric NOT NULL,
	"low" numeric NOT NULL,
	"close" numeric NOT NULL,
	"volume" numeric NOT NULL,
	CONSTRAINT "candles_market_resolution_time_unique" UNIQUE("market_pubkey","resolution","time")
);
--> statement-breakpoint
CREATE TABLE "markets" (
	"id" serial PRIMARY KEY NOT NULL,
	"pubkey" varchar(44) NOT NULL,
	"nft_mint" varchar(44) NOT NULL,
	"creator" varchar(44) NOT NULL,
	"created_at" timestamp NOT NULL,
	"duration" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"state" varchar(20) NOT NULL,
	"fee_protocol_bps" integer NOT NULL,
	"fee_creator_bps" integer NOT NULL,
	"current_price" numeric,
	"reserve_sol" numeric,
	"outstanding_shares" numeric,
	CONSTRAINT "markets_pubkey_unique" UNIQUE("pubkey")
);
--> statement-breakpoint
CREATE TABLE "nft_metadata" (
	"mint" varchar(44) PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"symbol" varchar(50),
	"image_url" text,
	"description" text,
	"attributes" jsonb,
	"fetched_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"signature" varchar(88) NOT NULL,
	"market_pubkey" varchar(44),
	"trader" varchar(44) NOT NULL,
	"direction" varchar(4) NOT NULL,
	"sol_amount" numeric NOT NULL,
	"share_amount" numeric NOT NULL,
	"price" numeric NOT NULL,
	"fee_paid" numeric NOT NULL,
	"timestamp" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candles" ADD CONSTRAINT "candles_market_pubkey_markets_pubkey_fk" FOREIGN KEY ("market_pubkey") REFERENCES "public"."markets"("pubkey") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_market_pubkey_markets_pubkey_fk" FOREIGN KEY ("market_pubkey") REFERENCES "public"."markets"("pubkey") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_trades_market" ON "trades" USING btree ("market_pubkey");--> statement-breakpoint
CREATE INDEX "idx_trades_timestamp" ON "trades" USING btree ("timestamp");