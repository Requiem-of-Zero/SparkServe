"use client";

import { useCallback, useState, type CSSProperties } from "react";

import type { CustomerMenuItem } from "@/lib/menu-display";

type CartFlyItem = {
  deltaX: number;
  deltaY: number;
  imageUrl?: string | null;
  left: number;
  name: string;
  top: number;
};

type CartFlyAnimationItem = Pick<CustomerMenuItem, "imageUrl" | "name">;

// Shared cart feedback animation used by quick add buttons and modal submits.
export function useCartFlyAnimation() {
  const [flyingCartItem, setFlyingCartItem] = useState<CartFlyItem | null>(null);

  const animateItemToCart = useCallback(
    (sourceElement: HTMLElement | null, item: CartFlyAnimationItem) => {
      const sourceRect = sourceElement?.getBoundingClientRect();
      const targetRect = document
        .querySelector("[data-cart-drop-target]")
        ?.getBoundingClientRect();

      if (
        !sourceRect ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return Promise.resolve();
      }

      const sourceX = sourceRect.left + sourceRect.width / 2;
      const sourceY = sourceRect.top + sourceRect.height / 2;
      const targetX = targetRect
        ? targetRect.left + targetRect.width / 2
        : window.innerWidth - 56;
      const targetY = targetRect
        ? targetRect.top + Math.min(targetRect.height / 2, 96)
        : window.innerHeight - 56;

      setFlyingCartItem({
        deltaX: targetX - sourceX,
        deltaY: targetY - sourceY,
        imageUrl: item.imageUrl,
        left: sourceX,
        name: item.name,
        top: sourceY,
      });

      return new Promise<void>((resolve) => {
        window.setTimeout(() => {
          setFlyingCartItem(null);
          resolve();
        }, 620);
      });
    },
    [],
  );

  const cartFlyAnimation = flyingCartItem ? (
    <div
      aria-hidden="true"
      className="cart-item-fly pointer-events-none fixed z-[60] h-14 w-14 overflow-hidden rounded-lg border border-[#ffd166]/70 bg-[#160b08] shadow-lg shadow-orange-950/50"
      style={
        {
          left: flyingCartItem.left,
          top: flyingCartItem.top,
          "--cart-fly-x": `${flyingCartItem.deltaX}px`,
          "--cart-fly-y": `${flyingCartItem.deltaY}px`,
        } as CSSProperties
      }
    >
      {flyingCartItem.imageUrl ? (
        <img
          src={flyingCartItem.imageUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] font-semibold text-[#ffd166]">
          {flyingCartItem.name}
        </div>
      )}
    </div>
  ) : null;

  return { animateItemToCart, cartFlyAnimation };
}
