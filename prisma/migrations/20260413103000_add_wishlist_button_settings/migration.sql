ALTER TABLE "ShopSettings"
ADD COLUMN "wishlistButtonStyle" TEXT NOT NULL DEFAULT 'outline';

ALTER TABLE "ShopSettings"
ADD COLUMN "wishlistButtonAccentColor" TEXT NOT NULL DEFAULT '#0f172a';

ALTER TABLE "ShopSettings"
ADD COLUMN "wishlistButtonTextColor" TEXT NOT NULL DEFAULT '#ffffff';

ALTER TABLE "ShopSettings"
ADD COLUMN "wishlistButtonIconColor" TEXT NOT NULL DEFAULT '#0f172a';
