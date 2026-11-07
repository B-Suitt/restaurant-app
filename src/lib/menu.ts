import { createClient } from "@/lib/supabase/client";

export type MenuExtra = { id: string; name: string; price: number };
export type MenuDish = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  photo_url: string | null;
  available: boolean;
  dish_extras: MenuExtra[];
};
export type MenuCategory = { id: string; name: string; description: string | null };

/** Carta visible: categorías activas y sus platos, ordenados por categoría y luego por plato. */
export async function loadMenu(): Promise<{ categories: MenuCategory[]; dishes: MenuDish[] }> {
  const supabase = createClient();
  const [categories, dishes] = await Promise.all([
    supabase.from("categories").select("id, name, description, sort_order").order("sort_order"),
    supabase
      .from("dishes")
      .select("id, category_id, name, description, price, photo_url, available, sort_order, dish_extras(id, name, price)")
      .order("sort_order"),
  ]);
  if (categories.error || dishes.error) throw categories.error ?? dishes.error;
  const order = new Map(categories.data.map((c, i) => [c.id, i]));
  return {
    categories: categories.data,
    dishes: dishes.data
      .filter((d) => order.has(d.category_id))
      .sort((a, b) => order.get(a.category_id)! - order.get(b.category_id)! || a.sort_order - b.sort_order),
  };
}
