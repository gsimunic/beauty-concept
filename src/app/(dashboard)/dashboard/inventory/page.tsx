import { StockMovementType } from "@prisma/client";
import { getServerSession } from "next-auth";

import { StatCard } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { createTranslator, getUserLocale } from "@/lib/i18n";
import { Section } from "@/components/ui/section";
import { getInventoryOverview } from "@/lib/services/inventory";

import { createProductAction, createStockMovementAction, updateProductAction } from "./actions";

export default async function InventoryPage() {
  const [{ products, suppliers, movements, totalInventoryValue, lowStockProducts }, session] =
    await Promise.all([getInventoryOverview(), getServerSession(authOptions)]);
  const locale = await getUserLocale(session?.user.id);
  const t = createTranslator(locale);

  return (
    <main className="grid gap-6">
      <h1 className="text-2xl font-semibold text-[var(--bc-text)]">{t("pages.inventory.title")}</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title={t("pages.inventory.totalInventoryValue")} value={formatCurrency(totalInventoryValue)} />
        <StatCard title={t("pages.inventory.products")} value={String(products.length)} />
        <StatCard title={t("pages.inventory.lowStockAlerts")} value={String(lowStockProducts.length)} />
      </div>

      <Section title={t("pages.inventory.addProduct")}>
        <form action={createProductAction} className="grid gap-3 md:grid-cols-3">
          <input name="name" placeholder={t("pages.inventory.productName")} required />
          <input name="sku" placeholder={t("pages.inventory.skuOptional")} />
          <input min={0} name="sellingPrice" placeholder={t("pages.inventory.sellingPrice")} step="0.01" type="number" required />
          <input min={0} name="averagePurchasePrice" placeholder={t("pages.inventory.avgPurchasePrice")} step="0.01" type="number" defaultValue="0" />
          <input min={0} name="initialStock" placeholder={t("pages.inventory.initialStock")} type="number" defaultValue="0" />
          <input min={0} name="minimumStockLevel" placeholder={t("pages.inventory.minimumStockLevel")} type="number" defaultValue="0" />
          <button className="md:col-span-3" type="submit">
            {t("pages.inventory.createProduct")}
          </button>
        </form>
      </Section>

      <Section title={t("pages.inventory.registerStockMovement")}>
        <p className="mb-3 text-xs text-[var(--bc-muted)]">
          {t("pages.inventory.movementRule")}
        </p>
        <form action={createStockMovementAction} className="grid gap-3 md:grid-cols-3">
          <select name="productId" required>
            <option value="">{t("pages.inventory.selectProduct")}</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({t("pages.inventory.stock")}: {product.currentStock})
              </option>
            ))}
          </select>

          <select defaultValue={StockMovementType.PURCHASE} name="type">
            {Object.values(StockMovementType).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <input name="quantity" placeholder={t("pages.inventory.quantitySigned")} type="number" required />

          <input name="purchasePrice" placeholder={t("pages.inventory.purchasePriceForPurchase")} step="0.01" type="number" min={0} />

          <select name="supplierId" defaultValue="">
            <option value="">{t("pages.inventory.noSupplier")}</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>

          <button className="md:col-span-3" type="submit">
            {t("pages.inventory.addMovement")}
          </button>
        </form>
      </Section>

      <Section title={t("pages.inventory.products")}>
        {products.length === 0 ? (
          <p className="text-sm text-[var(--bc-muted)]">{t("pages.inventory.noProducts")}</p>
        ) : (
          <div className="grid gap-3">
            {products.map((product) => {
              const isLowStock = product.currentStock <= product.minimumStockLevel;

              return (
                <form
                  action={updateProductAction}
                  className={`grid gap-3 rounded-lg border p-4 md:grid-cols-6 ${
                    isLowStock
                      ? "border-[#c9887a] bg-[#fff1ef]"
                      : "border-[var(--bc-border)] bg-[#fffdf9]"
                  }`}
                  key={product.id}
                >
                  <input type="hidden" name="id" value={product.id} />
                  <input name="name" defaultValue={product.name} required />
                  <input name="sku" defaultValue={product.sku ?? ""} placeholder="SKU" />
                  <input name="sellingPrice" type="number" step="0.01" min={0} defaultValue={Number(product.sellingPrice)} required />
                  <input
                    name="averagePurchasePrice"
                    type="number"
                    step="0.01"
                    min={0}
                    defaultValue={Number(product.averagePurchasePrice)}
                    required
                  />
                  <input name="minimumStockLevel" type="number" min={0} defaultValue={product.minimumStockLevel} required />
                  <div className="md:col-span-6 flex items-center justify-between">
                    <span className="text-xs text-[var(--bc-muted)]">
                      {t("pages.inventory.stock")}: {product.currentStock} | {t("pages.inventory.sellingPrice")}: {formatCurrency(Number(product.sellingPrice))} | {t("pages.inventory.avgPurchasePrice")}: {formatCurrency(Number(product.averagePurchasePrice))} | {isLowStock ? t("financial.lowStock") : t("pages.inventory.stockLevelOk")}
                    </span>
                    <button type="submit">{t("pages.inventory.saveProduct")}</button>
                  </div>
                </form>
              );
            })}
          </div>
        )}
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
                    <td className="px-2 py-2">{movement.type}</td>
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
    </main>
  );
}
