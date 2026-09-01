import type { Order, OrderItem } from '@/shared/types';

type ApiOrderItem = {
  id: string;
  productNameSnapshot?: string;
  unitPriceSnapshot?: number | string;
  quantity: number;
  lineTotal?: number | string;
  customizations?: {
    groupNameSnapshot?: string;
    optionNameSnapshot?: string;
    additionalPriceSnapshot?: number | string;
  }[];
};

export function mapOrder(raw: Record<string, unknown>): Order {
  const items = (raw.items as ApiOrderItem[] | undefined)?.map((item) => ({
    id: item.id,
    name: item.productNameSnapshot ?? 'Item',
    quantity: item.quantity,
    unitPrice: Number(item.unitPriceSnapshot ?? 0),
    customizations: item.customizations?.map((c) => ({
      name: c.groupNameSnapshot ?? '',
      option: c.optionNameSnapshot ?? '',
      price: Number(c.additionalPriceSnapshot ?? 0),
    })),
  })) as OrderItem[];

  return {
    ...(raw as unknown as Order),
    items: items ?? [],
    total: Number(raw.total ?? 0),
    subtotal: raw.subtotal !== undefined ? Number(raw.subtotal) : undefined,
    tax: raw.tax !== undefined ? Number(raw.tax) : undefined,
    createdAt:
      typeof raw.createdAt === 'string'
        ? raw.createdAt
        : raw.createdAt instanceof Date
          ? raw.createdAt.toISOString()
          : '',
  };
}

export function mapProduct(raw: Record<string, unknown>) {
  return {
    ...raw,
    soldOut: Boolean(raw.isSoldOut),
    active: raw.isActive !== false,
    price: Number(raw.price ?? 0),
    isTopSale: Boolean(raw.isTopSale),
    discountPercent:
      raw.discountPercent === null || raw.discountPercent === undefined
        ? null
        : Number(raw.discountPercent),
    compareAtPrice:
      raw.compareAtPrice === null || raw.compareAtPrice === undefined
        ? null
        : Number(raw.compareAtPrice),
  };
}

export function mapCategory(raw: Record<string, unknown>) {
  return {
    ...raw,
    active: raw.isActive !== false,
  };
}

export function mapCustomer(raw: Record<string, unknown>) {
  const count = raw._count as { orders?: number } | undefined;
  const orders = raw.orders as { total?: number | string }[] | undefined;
  return {
    id: raw.id as string,
    name: raw.name as string,
    email: raw.email as string | undefined,
    phone: raw.phone as string | undefined,
    ordersCount: count?.orders ?? orders?.length ?? 0,
    totalSpent: orders?.reduce((sum, o) => sum + Number(o.total ?? 0), 0) ?? 0,
    createdAt: raw.createdAt as string | undefined,
  };
}

export function mapCustomization(raw: Record<string, unknown>) {
  const options =
    (raw.options as { name: string; additionalPrice?: number | string }[]) ??
    [];
  return {
    id: raw.id as string,
    name: raw.name as string,
    required: Boolean(raw.isRequired),
    active: raw.isActive !== false,
    options: options.map((o) => ({
      name: o.name,
      price: Number(o.additionalPrice ?? 0),
    })),
  };
}
