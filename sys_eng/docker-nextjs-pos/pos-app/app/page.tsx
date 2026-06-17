"use client";

import { useMemo, useState } from "react";

const menuItems = [
  { id: 1, name: "Beef Noodle Soup", price: 13.99 },
  { id: 2, name: "Chicken Rice Plate", price: 11.99 },
  { id: 3, name: "Pork Dumplings", price: 8.99 },
  { id: 4, name: "Milk Tea", price: 4.99 },
];

type OrderItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Default App Name";

export default function Home() {
  const [order, setOrder] = useState<OrderItem[]>([]);

  function addItem(item: Omit<OrderItem, "quantity">) {
    setOrder((currentOrder) => {
      const existingItem = currentOrder.find(
        (orderItem) => orderItem.id === item.id,
      );

      if (existingItem) {
        return currentOrder.map((orderItem) =>
          orderItem.id === item.id
            ? { ...orderItem, quantity: orderItem.quantity + 1 }
            : orderItem,
        );
      }

      return [...currentOrder, { ...item, quantity: 1 }];
    });
  }

  const total = useMemo(() => {
    return order.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [order]);

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <section className="mx-auto max-w-5xl">
        <h1 className="text-4xl font-bold">{appName}</h1>
        <p className="mt-2 text-zinc-400">
          Tiny Next.js point-of-sale app deployed behind NGINX.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold">Menu</h2>

            <div className="mt-4 space-y-3">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addItem(item)}
                  className="flex w-full items-center justify-between rounded-lg bg-zinc-800 p-4 text-left hover:bg-zinc-700"
                >
                  <span>{item.name}</span>
                  <span>${item.price.toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-zinc-900 p-6">
            <h2 className="text-2xl font-semibold">Current Order</h2>

            <div className="mt-4 space-y-3">
              {order.length === 0 ? (
                <p className="text-zinc-400">No items added yet.</p>
              ) : (
                order.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between border-b border-zinc-800 pb-2"
                  >
                    <span>
                      {item.name} x {item.quantity}
                    </span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex items-center justify-between text-xl font-bold">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>

            <button
              onClick={() => setOrder([])}
              className="mt-6 w-full rounded-lg bg-red-600 p-3 font-semibold hover:bg-red-500"
            >
              Clear Order
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
