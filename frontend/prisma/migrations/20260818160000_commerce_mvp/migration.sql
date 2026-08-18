-- AlterEnum
ALTER TYPE "TryOnJobStatus" ADD VALUE 'CANCELLED';

-- AlterTable User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'CUSTOMER';
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");
CREATE INDEX IF NOT EXISTS "User_accountStatus_idx" ON "User"("accountStatus");

-- AlterTable Product indexes
CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX IF NOT EXISTS "Product_brandId_idx" ON "Product"("brandId");
CREATE INDEX IF NOT EXISTS "Product_isPublished_isActive_idx" ON "Product"("isPublished", "isActive");
CREATE INDEX IF NOT EXISTS "ProductImage_productId_sortOrder_idx" ON "ProductImage"("productId", "sortOrder");
CREATE INDEX IF NOT EXISTS "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- AlterTable Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "couponCode" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;
ALTER TABLE "Order" ALTER COLUMN "orderStatus" SET DEFAULT 'PENDING_PAYMENT';

CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_orderStatus_idx" ON "Order"("orderStatus");
CREATE INDEX IF NOT EXISTS "Order_paymentStatus_idx" ON "Order"("paymentStatus");
CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "OrderItem_variantId_idx" ON "OrderItem"("variantId");

-- Cart / address indexes
CREATE INDEX IF NOT EXISTS "Cart_userId_idx" ON "Cart"("userId");
CREATE INDEX IF NOT EXISTS "Cart_sessionId_idx" ON "Cart"("sessionId");
CREATE INDEX IF NOT EXISTS "Address_userId_isDefault_idx" ON "Address"("userId", "isDefault");

-- Human representation planned/available fields
ALTER TABLE "UserModel" ADD COLUMN IF NOT EXISTS "poseJson" JSONB;
ALTER TABLE "UserModel" ADD COLUMN IF NOT EXISTS "densePoseUrl" TEXT;
ALTER TABLE "UserModel" ADD COLUMN IF NOT EXISTS "measurementsJson" JSONB;
ALTER TABLE "UserModel" ADD COLUMN IF NOT EXISTS "representationVersion" TEXT;
ALTER TABLE "UserModel" ADD COLUMN IF NOT EXISTS "provider" TEXT;
ALTER TABLE "UserModel" ADD COLUMN IF NOT EXISTS "modelVersion" TEXT;
CREATE INDEX IF NOT EXISTS "UserModel_userId_isDefault_idx" ON "UserModel"("userId", "isDefault");

-- Try-on job metadata
ALTER TABLE "TryOnJob" ADD COLUMN IF NOT EXISTS "requestId" TEXT;
ALTER TABLE "TryOnJob" ADD COLUMN IF NOT EXISTS "operation" TEXT NOT NULL DEFAULT 'virtual_try_on';
ALTER TABLE "TryOnJob" ADD COLUMN IF NOT EXISTS "remoteJobId" TEXT;
ALTER TABLE "TryOnJob" ADD COLUMN IF NOT EXISTS "provider" TEXT;
ALTER TABLE "TryOnJob" ADD COLUMN IF NOT EXISTS "modelVersion" TEXT;
ALTER TABLE "TryOnJob" ADD COLUMN IF NOT EXISTS "errorCode" TEXT;
ALTER TABLE "TryOnJob" ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;
ALTER TABLE "TryOnJob" ADD COLUMN IF NOT EXISTS "correlationId" TEXT;
ALTER TABLE "TryOnJob" ADD COLUMN IF NOT EXISTS "inputAssetIds" JSONB;
ALTER TABLE "TryOnJob" ADD COLUMN IF NOT EXISTS "outputAssetIds" JSONB;
ALTER TABLE "TryOnJob" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "TryOnJob_requestId_key" ON "TryOnJob"("requestId");
CREATE INDEX IF NOT EXISTS "TryOnJob_userId_createdAt_idx" ON "TryOnJob"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "TryOnJob_status_idx" ON "TryOnJob"("status");

-- Inventory movements
CREATE TABLE IF NOT EXISTS "InventoryMovement" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InventoryMovement_variantId_createdAt_idx" ON "InventoryMovement"("variantId", "createdAt");
CREATE INDEX IF NOT EXISTS "InventoryMovement_orderId_idx" ON "InventoryMovement"("orderId");

-- Payments
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'REQUIRES_ACTION',
    "clientSecret" TEXT,
    "idempotencyKey" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_providerRef_key" ON "Payment"("providerRef");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "Payment_orderId_idx" ON "Payment"("orderId");
CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment"("status");

CREATE TABLE IF NOT EXISTS "PaymentEvent" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentEvent_providerEventId_key" ON "PaymentEvent"("providerEventId");
CREATE INDEX IF NOT EXISTS "PaymentEvent_paymentId_processedAt_idx" ON "PaymentEvent"("paymentId", "processedAt");

-- Reviews
CREATE TABLE IF NOT EXISTS "Review" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Review_userId_productId_key" ON "Review"("userId", "productId");
CREATE INDEX IF NOT EXISTS "Review_productId_createdAt_idx" ON "Review"("productId", "createdAt");

-- Coupons
CREATE TABLE IF NOT EXISTS "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DECIMAL(10,2) NOT NULL,
    "minOrder" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Coupon_code_key" ON "Coupon"("code");

CREATE TABLE IF NOT EXISTS "CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CouponRedemption_couponId_orderId_key" ON "CouponRedemption"("couponId", "orderId");
CREATE INDEX IF NOT EXISTS "CouponRedemption_userId_idx" ON "CouponRedemption"("userId");

-- Returns and refunds
CREATE TABLE IF NOT EXISTS "ReturnRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ReturnRequest_orderId_idx" ON "ReturnRequest"("orderId");
CREATE INDEX IF NOT EXISTS "ReturnRequest_userId_status_idx" ON "ReturnRequest"("userId", "status");

CREATE TABLE IF NOT EXISTS "Refund" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT,
    "returnRequestId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "providerRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Refund_providerRef_key" ON "Refund"("providerRef");
CREATE INDEX IF NOT EXISTS "Refund_orderId_idx" ON "Refund"("orderId");

-- Notifications
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- Media assets
CREATE TABLE IF NOT EXISTS "MediaAsset" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "kind" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "checksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");
CREATE INDEX IF NOT EXISTS "MediaAsset_ownerUserId_kind_idx" ON "MediaAsset"("ownerUserId", "kind");

-- Foreign keys
ALTER TABLE "InventoryMovement" DROP CONSTRAINT IF EXISTS "InventoryMovement_inventoryId_fkey";
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" DROP CONSTRAINT IF EXISTS "InventoryMovement_orderId_fkey";
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_orderId_fkey";
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PaymentEvent" DROP CONSTRAINT IF EXISTS "PaymentEvent_paymentId_fkey";
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_userId_fkey";
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_productId_fkey";
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CouponRedemption" DROP CONSTRAINT IF EXISTS "CouponRedemption_couponId_fkey";
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" DROP CONSTRAINT IF EXISTS "CouponRedemption_userId_fkey";
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" DROP CONSTRAINT IF EXISTS "CouponRedemption_orderId_fkey";
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReturnRequest" DROP CONSTRAINT IF EXISTS "ReturnRequest_orderId_fkey";
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReturnRequest" DROP CONSTRAINT IF EXISTS "ReturnRequest_userId_fkey";
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Refund" DROP CONSTRAINT IF EXISTS "Refund_orderId_fkey";
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Refund" DROP CONSTRAINT IF EXISTS "Refund_paymentId_fkey";
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Refund" DROP CONSTRAINT IF EXISTS "Refund_returnRequestId_fkey";
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_userId_fkey";
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_orderId_fkey";
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MediaAsset" DROP CONSTRAINT IF EXISTS "MediaAsset_ownerUserId_fkey";
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
