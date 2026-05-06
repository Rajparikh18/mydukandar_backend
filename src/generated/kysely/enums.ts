export const UserRole = {
    CUSTOMER: "CUSTOMER",
    SHOP_OWNER: "SHOP_OWNER"
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
export const OrderStatus = {
    PENDING: "PENDING",
    ACCEPTED: "ACCEPTED",
    PACKING: "PACKING",
    READY: "READY",
    PICKED_UP: "PICKED_UP",
    CANCELLED: "CANCELLED"
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
export const PaymentMethod = {
    CASH: "CASH",
    ONLINE: "ONLINE",
    UDHAAR: "UDHAAR"
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];
export const DeliveryMode = {
    SELF_PICKUP: "SELF_PICKUP",
    DELIVERY: "DELIVERY"
} as const;
export type DeliveryMode = (typeof DeliveryMode)[keyof typeof DeliveryMode];
export const ProductCategory = {
    GROCERY: "GROCERY",
    STATIONERY: "STATIONERY",
    MEDICAL: "MEDICAL",
    HOUSEHOLD: "HOUSEHOLD",
    OTHER: "OTHER"
} as const;
export type ProductCategory = (typeof ProductCategory)[keyof typeof ProductCategory];
