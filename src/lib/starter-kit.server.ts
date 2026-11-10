import { getSql } from "@/lib/db";
import { readMembership } from "@/lib/membership.functions";
import { countStarterKitPurchases, readStarterKitOwnership } from "@/lib/starter-kit.purchase";
import { starterKitPageState, type StarterKitPageState } from "@/lib/starter-kit";

export async function loadStarterKitPage(userId: string | null): Promise<StarterKitPageState> {
  const sql = await getSql();
  if (!userId) {
    const purchaseCount = await countStarterKitPurchases(sql);
    return starterKitPageState({
      userId: null,
      purchaseCount,
      paid: false,
      deskBonus: false,
      redeemed: false,
      membershipActive: false,
    });
  }
  const [purchaseCount, ownership, membership] = await Promise.all([
    countStarterKitPurchases(sql),
    readStarterKitOwnership(sql, userId),
    readMembership(userId),
  ]);
  return starterKitPageState({
    userId,
    purchaseCount,
    paid: ownership.paid,
    deskBonus: ownership.deskBonus,
    redeemed: ownership.redeemed,
    membershipActive: membership.active,
  });
}
