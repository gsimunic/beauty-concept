import { StockMovementType } from "@prisma/client";
import Link from "next/link";
import { getServerSession } from "next-auth";

import { StatCard } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { createTranslator, getUserLocale } from "@/lib/i18n";
import { Section } from "@/components/ui/section";
import { getInventoryOverview } from "@/lib/services/inventory";

import {
  createProductAction,
  createStockMovementAction,
  deleteProductAction,
  updateInventorySettingsAction
} from "./actions";

type InventoryPageProps = {
  searchParams?: {
    tab?: string;
  };
};

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const [{ products, suppliers, movements, totalInventoryValue, lowStockProducts }, session] =
    await Promise.all([getInventoryOverview(), getServerSession(authOptions)]);
  const locale = await getUserLocale(session?.user.id);
  const t = createTranslator(locale);
  const currentTab = searchParams?.tab === "inventory" ? "inventory" : "products";
  const movementTypeLabel: Record<string, string> = {
    PURCHASE: t("pages.inventory.movementTypePurchase"),
    SALE: t("pages.inventory.movementTypeSale"),
    CONSUMPTION: t("pages.inventory.movementTypeConsumption"),
    MANUAL_ADJUSTMENT: t("pages.inventory.movementTypeManualAdjustment")
  };

  return (
    <main className="grid gap-6">
      <h1 className="text-2xl font-semibold text-[var(--bc-text)]">{t("pages.inventory.title")}</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title={t("pages.inventory.totalInventoryValue")} value={formatCurrency(totalInventoryValue)} />
        <StatCard title={t("pages.inventory.products")} value={String(products.length)} />
        <StatCard title={t("pages.inventory.lowStockAlerts")} value={String(lowStockProducts.length)} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard/inventory?tab=products"
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            currentTab === "products" ? "bg-[#a98061] text-white" : "bg-[#eadaca] text-[var(--bc-text)]"
          }`}
        >
          {t("pages.inventory.productsTab")}
        </Link>
        <Link
          href="/dashboard/inventory?tab=inventory"
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            currentTab === "inventory" ? "bg-[#a98061] text-white" : "bg-[#eadaca] text-[var(--bc-text)]"
          }`}
        >
          {t("pages.inventory.inventoryTab")}
        </Link>
      </div>

      {currentTab === "products" ? (
        <>
          <Section title={t("pages.inventory.addProduct")}>
            <form action={createProductAction} className="grid gap-3 md:grid-cols-3">
              <label className="grid gap-1 text-xs text-[var(--bc-muted)]">
                {t("pages.inventory.productName")}
                <input name="name" required />
              </label>
              <label className="grid gap-1 text-xs text-[var(--bc-muted)]">
                {t("pages.inventory.skuOptional")}
                <input name="sku" />
              </label>
              <label className="grid gap-1 text-xs text-[var(--bc-muted)]">
                {t("pages.inventory.sellingPriceEur")}
                <div className="flex items-center rounded-md border border-[var(--bc-border)] bg-[#fffdf9]">
                  <input
                    className="flex-1 border-0 bg-transparent"
                    min={0}
                    name="sellingPrice"
                    step="0.01"
                    type="number"
                    required
                  />
                  <span className="px-3 text-sm text-[var(--bc-muted)]">€</span>
                </div>
              </label>
              <label className="grid gap-1 text-xs text-[var(--bc-muted)]">
                {t("pages.inventory.avgPurchasePriceEur")}
                <div className="flex items-center rounded-md border border-[var(--bc-border)] bg-[#fffdf9]">
                  <input
                    className="flex-1 border-0 bg-transparent"
                    min={0}
                    name="averagePurchasePrice"
                    step="0.01"
                    type="number"
                    defaultValue="0"
                  />
                  <span className="px-3 text-sm text-[var(--bc-muted)]">€</span>
                </div>
              </label>
              <button className="md:col-span-3" type="submit">
                {t("pages.inventory.createProduct")}
              </button>
            </form>
          </Section>

          <Section title={t("pages.inventory.products")}>
            {products.length === 0 ? (
              <p className="text-sm text-[var(--bc-muted)]">{t("pages.inventory.noProducts")}</p>
            ) : (
              <div className="grid gap-3">
                {products.map((product) => (
                  <div className="grid gap-2 rounded-lg border border-[var(--bc-border)] bg-[#fffdf9] p-4" key={product.id}>
                    <p className="text-sm font-medium text-[var(--bc-text)]">{product.name}</p>
                    <p className="text-xs text-[var(--bc-muted)]">SKU: {product.sku ?? "-"}</p>
                    <p className="text-xs text-[var(--bc-muted)]">
                      {t("pages.inventory.sellingPrice")}: {formatCurrency(Number(product.sellingPrice))} | {t("pages.inventory.avgPurchasePrice")}: {formatCurrency(Number(product.averagePurchasePrice))}
                    </p>
                    <div className="flex justify-end">
                      <form action={deleteProductAction}>
                        <input type="hidden" name="id" value={product.id} />
                        <button className="bg-[#7f3b34] hover:bg-[#6d322c]" type="submit">
                          {t("common.delete")}
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      ) : (
        <>
          <Section title={t("pages.inventory.inventoryTab")}>
            {products.length === 0 ? (
              <p className="text-sm text-[var(--bc-muted)]">{t("pages.inventory.noProducts")}</p>
            ) : (
              <div className="grid gap-3">
                {products.map((product) => {
                  const stock = product.inventory?.currentStock ?? 0;
                  const min = product.inventory?.minimumStockLevel ?? 0;
                  const isLowStock = stock <= min;

                  return (
                    <div
                      key={product.id}
                      className={`grid gap-2 rounded-lg border p-4 ${
                        isLowStock ? "border-[#c9887a] bg-[#fff1ef]" : "border-[var(--bc-border)] bg-[#fffdf9]"
                      }`}
                    >
                      <p className="text-sm font-medium text-[var(--bc-text)]">{product.name}</p>
                      <p className="text-xs text-[var(--bc-muted)]">
                        {t("pages.inventory.stock")}: {stock} | {t("pages.inventory.minimumStockLevel")}: {min}
                      </p>
                      <form action={updateInventorySettingsAction} className="grid gap-2 md:grid-cols-[1fr_auto]">
                        <input type="hidden" name="productId" value={product.id} />
                        <label className="grid gap-1 text-xs text-[var(--bc-muted)]">
                          {t("pages.inventory.minimumStockLevelQty")}
                          <input name="minimumStockLevel" type="number" min={0} defaultValue={min} required />
                        </label>
                        <button className="self-end" type="submit">
                          {t("common.save")}
                        </button>
                      </form>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          <Section title={t("pages.inventory.registerStockMovement")}>
            <p className="mb-3 text-xs text-[var(--bc-muted)]">{t("pages.inventory.movementRule")}</p>
            <form action={createStockMovementAction} className="grid gap-3 md:grid-cols-3">
              <label className="grid gap-1 text-xs text-[var(--bc-muted)]">
                {t("pages.inventory.selectProduct")}
                <select name="productId" required>
                  <option value="">{t("pages.inventory.selectProduct")}</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({t("pages.inventory.stock")}: {product.inventory?.currentStock ?? 0})
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-xs text-[var(--bc-muted)]">
                {t("pages.inventory.type")}
                <select defaultValue={StockMovementType.PURCHASE} name="type">
                  {Object.values(StockMovementType).map((type) => (
                    <option key={type} value={type}>
                      {movementTypeLabel[type] ?? type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-xs text-[var(--bc-muted)]">
                {t("pages.inventory.quantitySigned")}
                <input name="quantity" type="number" required />
              </label>

              <label className="grid gap-1 text-xs text-[var(--bc-muted)]">
                {t("pages.inventory.purchasePriceForPurchase")}
                <input name="purchasePrice" step="0.01" type="number" min={0} />
              </label>

              <label className="grid gap-1 text-xs text-[var(--bc-muted)]">
                {t("pages.inventory.supplier")}
                <select name="supplierId" defaultValue="">
                  <option value="">{t("pages.inventory.noSupplier")}</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </label>

              <button className="md:col-span-3" type="submit">
                {t("pages.inventory.addMovement")}
              </button>
            </form>
          </Section>

          <Section title={t("pages.inventory.recentStockMovements")}>
            {movements.length === 0 ? (
              <p className="text-sm text-[var(--bc-muted)]">{t("pages.inventory.noStockMovements")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--bc-border)] text-[var(--bc-muted)]">
                      <th className="px-2 py-2 font-medium">{t("common.date")}</th>
                      <th className="px-2 py-2 font-medium">{t("pages.inventory.products")}</th>
                      <th className="px-2 py-2 font-medium">{t("pages.inventory.type")}</th>
                      <th className="px-2 py-2 font-medium">{t("common.quantity")}</th>
                      <th className="px-2 py-2 font-medium">{t("pages.inventory.purchasePrice")}</th>
                      <th className="px-2 py-2 font-medium">{t("pages.inventory.supplier")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((movement) => (
                      <tr className="border-b border-[#efe3d4]" key={movement.id}>
                        <td className="px-2 py-2">{new Date(movement.createdAt).toLocaleString()}</td>
                        <td className="px-2 py-2">{movement.product.name}</td>
                        <td className="px-2 py-2">{movementTypeLabel[movement.type] ?? movement.type}</td>
                        <td className="px-2 py-2">{movement.quantity}</td>
                        <td className="px-2 py-2">
                          {movement.purchasePrice ? formatCurrency(Number(movement.purchasePrice)) : "-"}
                        </td>
                        <td className="px-2 py-2">{movement.supplier?.name ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </>
      )}
    </main>
  );
}
