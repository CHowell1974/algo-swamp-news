import levelsSource from "../../content/studies/MotherBarLevels.thinkscript?raw";
import scanSource from "../../content/studies/MotherBarSweepScan.thinkscript?raw";
import {
  MOTHER_BAR_LEVELS_ID,
  MOTHER_BAR_SWEEP_SCAN_ID,
  courseOffer,
  type CourseOffer,
} from "@/lib/course/access";
import { hasPaidCourse } from "@/lib/course/store.server";
import { UnauthorizedError, requireUserId } from "@/lib/auth/verify.server";
import { deliverableThinkscript, studyFileHeader } from "@/lib/studies/catalog";

const SOURCES: Record<string, { kind: "study" | "scan"; source: string }> = {
  [MOTHER_BAR_LEVELS_ID]: { kind: "study", source: levelsSource },
  [MOTHER_BAR_SWEEP_SCAN_ID]: { kind: "scan", source: scanSource },
};

function downloadOffer(productId: string): CourseOffer | null {
  const offer = courseOffer(productId);
  if (!offer || offer.kind !== "download" || !offer.downloadFilename) return null;
  if (!SOURCES[offer.id]) return null;
  return offer;
}

export async function loadStudyAccess(
  userId: string | null,
  productId: string,
): Promise<{ productId: string; signedIn: boolean; owned: boolean }> {
  const offer = downloadOffer(productId);
  if (!offer) throw new Error("That product is not available.");
  if (!userId) return { productId: offer.id, signedIn: false, owned: false };
  return {
    productId: offer.id,
    signedIn: true,
    owned: await hasPaidCourse(userId, offer.id),
  };
}

export async function studyDownloadResponse(productId: string): Promise<Response> {
  const offer = downloadOffer(productId);
  if (!offer) return new Response("Not found.", { status: 404 });
  const file = SOURCES[offer.id];
  if (!file || !offer.downloadFilename) return new Response("Not found.", { status: 404 });

  let userId: string;
  try {
    userId = await requireUserId();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return new Response("Sign in to download this file.", { status: 401 });
    }
    throw error;
  }

  const owned = await hasPaidCourse(userId, offer.id);
  if (!owned) {
    return new Response("This file is available after purchase.", { status: 403 });
  }

  const body = deliverableThinkscript(studyFileHeader(file.kind), file.source);
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="${offer.downloadFilename}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
