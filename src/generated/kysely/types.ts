import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

import type { UserRole, OrderStatus, PaymentMethod, DeliveryMode, ProductCategory } from "./enums";

export type CustomerShopConnection = {
    id: string;
    createdAt: Generated<Timestamp>;
    balance: Generated<number>;
    customerId: string;
    shopId: string;
};
export type Order = {
    id: string;
    status: Generated<OrderStatus>;
    totalAmount: number;
    notes: string | null;
    isPaid: Generated<boolean>;
    paymentMode: Generated<PaymentMethod>;
    deliveryMode: Generated<DeliveryMode>;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
    customerId: string;
    shopId: string;
};
export type OrderItem = {
    id: string;
    quantity: number;
    price: number;
    orderId: string;
    productId: string;
};
export type Payment = {
    id: string;
    amount: number;
    method: PaymentMethod;
    note: string | null;
    createdAt: Generated<Timestamp>;
    customerId: string;
    shopId: string;
    orderId: string | null;
};
export type Product = {
    id: string;
    name: string;
    description: string | null;
    price: number;
    mrp: number | null;
    unit: Generated<string>;
    category: Generated<ProductCategory>;
    imageUrl: string | null;
    inStock: Generated<boolean>;
    quantity: Generated<number>;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
    shopId: string;
};
export type PushSubscription = {
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    expirationTime: Timestamp | null;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
    userId: string;
};
export type Shop = {
    id: string;
    name: string;
    description: string | null;
    address: string;
    city: string;
    pincode: string;
    phone: string;
    latitude: number | null;
    longitude: number | null;
    isActive: Generated<boolean>;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
    ownerId: string;
};
export type User = {
    id: string;
    email: string;
    password: string;
    name: string;
    phone: string | null;
    role: UserRole;
    createdAt: Generated<Timestamp>;
    updatedAt: Timestamp;
};
export type DB = {
    CustomerShopConnection: CustomerShopConnection;
    Order: Order;
    OrderItem: OrderItem;
    Payment: Payment;
    Product: Product;
    PushSubscription: PushSubscription;
    Shop: Shop;
    User: User;
};
