import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

// ── Types ────────────────────────────────────────────────

const VALID_REASONS = ["stale_price", "wrong_price", "closed", "other"] as const;
type ReportReason = (typeof VALID_REASONS)[number];

interface ReportInput {
  stationKey: string;
  stationName: string;
  stationBrand: string;
  stationAddress: string;
  prices: { GasType: string; Price: string; IsAvailable: boolean }[];
  reason: ReportReason;
  comment?: string;
  coords: { lat: number; lng: number };
}

// ── submitReport ─────────────────────────────────────────

export const submitReport = onCall(
  { region: "northamerica-northeast1", maxInstances: 10 },
  async (request) => {
    const data = request.data as ReportInput;

    // Validate required fields
    if (
      !data.stationKey ||
      !data.stationName ||
      !data.stationAddress ||
      !data.coords?.lat ||
      !data.coords?.lng ||
      !data.reason
    ) {
      throw new HttpsError("invalid-argument", "Champs requis manquants.");
    }

    // Validate reason enum
    if (!VALID_REASONS.includes(data.reason)) {
      throw new HttpsError(
        "invalid-argument",
        `Raison invalide. Valeurs acceptées : ${VALID_REASONS.join(", ")}`
      );
    }

    // Validate stationKey format matches coords
    const expectedKey = `${data.coords.lat},${data.coords.lng}`;
    if (data.stationKey !== expectedKey) {
      throw new HttpsError(
        "invalid-argument",
        "stationKey ne correspond pas aux coordonnées."
      );
    }

    // Sanitize optional comment (max 500 chars)
    const comment = data.comment ? data.comment.slice(0, 500).trim() : "";

    // Rate limiting: max 5 reports per station per day (anonymous, per-station)
    const oneDayAgo = Timestamp.fromDate(
      new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    const recentReports = await db
      .collection("reports")
      .where("stationKey", "==", data.stationKey)
      .where("createdAt", ">=", oneDayAgo)
      .count()
      .get();

    if (recentReports.data().count >= 5) {
      throw new HttpsError(
        "resource-exhausted",
        "Trop de signalements pour cette station aujourd'hui. Réessayez demain."
      );
    }

    // Write the report document
    const reportRef = await db.collection("reports").add({
      stationKey: data.stationKey,
      stationName: data.stationName,
      stationBrand: data.stationBrand || "",
      stationAddress: data.stationAddress,
      prices: Array.isArray(data.prices) ? data.prices : [],
      reason: data.reason,
      comment,
      coords: {
        lat: data.coords.lat,
        lng: data.coords.lng,
      },
      createdAt: FieldValue.serverTimestamp(),
    });

    // Update aggregate counter
    const countRef = db.collection("reportCounts").doc(data.stationKey);
    await countRef.set(
      {
        total: FieldValue.increment(1),
        lastReportAt: FieldValue.serverTimestamp(),
        stationName: data.stationName,
        stationBrand: data.stationBrand || "",
        stationAddress: data.stationAddress,
      },
      { merge: true }
    );

    return { success: true, reportId: reportRef.id };
  }
);

// ── weeklyDigest ─────────────────────────────────────────

export const weeklyDigest = onSchedule(
  {
    schedule: "every monday 08:00",
    timeZone: "America/Montreal",
    region: "northamerica-northeast1",
  },
  async () => {
    const sevenDaysAgo = Timestamp.fromDate(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    // Fetch all reports from the last 7 days
    const snapshot = await db
      .collection("reports")
      .where("createdAt", ">=", sevenDaysAgo)
      .orderBy("createdAt", "desc")
      .get();

    if (snapshot.empty) {
      console.log("Aucun signalement cette semaine — pas d'envoi.");
      return;
    }

    // Group by station
    const stationMap = new Map<
      string,
      {
        name: string;
        brand: string;
        address: string;
        count: number;
        reasons: Record<string, number>;
        latestPrices: { GasType: string; Price: string }[];
      }
    >();

    for (const doc of snapshot.docs) {
      const d = doc.data();
      const key = d.stationKey as string;

      if (!stationMap.has(key)) {
        stationMap.set(key, {
          name: d.stationName,
          brand: d.stationBrand || "",
          address: d.stationAddress,
          count: 0,
          reasons: {},
          latestPrices: d.prices || [],
        });
      }

      const station = stationMap.get(key)!;
      station.count++;
      const reason = d.reason as string;
      station.reasons[reason] = (station.reasons[reason] || 0) + 1;
    }

    // Sort by report count descending
    const sorted = [...stationMap.entries()].sort(
      (a, b) => b[1].count - a[1].count
    );

    // Build dates for the report period
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) =>
      d.toLocaleDateString("fr-CA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

    const reasonLabels: Record<string, string> = {
      stale_price: "Prix périmé",
      wrong_price: "Prix erroné",
      closed: "Station fermée",
      other: "Autre",
    };

    // Build HTML email
    const rows = sorted
      .map(([, s]) => {
        const mainReason = Object.entries(s.reasons).sort(
          (a, b) => b[1] - a[1]
        )[0];
        const mainReasonLabel = reasonLabels[mainReason[0]] || mainReason[0];

        const priceStr = s.latestPrices
          .filter((p: { GasType: string; Price: string }) => p.Price)
          .map((p: { GasType: string; Price: string }) => `${p.GasType}: ${p.Price}`)
          .join(", ");

        return `<tr>
          <td style="padding:6px 12px;border:1px solid #ddd;">${s.brand ? s.brand + " — " : ""}${s.name}</td>
          <td style="padding:6px 12px;border:1px solid #ddd;">${s.address}</td>
          <td style="padding:6px 12px;border:1px solid #ddd;text-align:center;">${s.count}</td>
          <td style="padding:6px 12px;border:1px solid #ddd;">${mainReasonLabel}</td>
          <td style="padding:6px 12px;border:1px solid #ddd;font-size:12px;">${priceStr || "N/D"}</td>
        </tr>`;
      })
      .join("\n");

    const totalReports = snapshot.size;
    const totalStations = stationMap.size;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:900px;margin:0 auto;">
        <h2 style="color:#1e3a5f;">Régie Essence Québec — Rapport hebdomadaire</h2>
        <p>Période : <strong>${fmt(weekAgo)}</strong> au <strong>${fmt(now)}</strong></p>
        <p><strong>${totalReports}</strong> signalement${totalReports > 1 ? "s" : ""} sur <strong>${totalStations}</strong> station${totalStations > 1 ? "s" : ""}</p>

        <table style="border-collapse:collapse;width:100%;margin-top:16px;">
          <thead>
            <tr style="background:#f0f4f8;">
              <th style="padding:8px 12px;border:1px solid #ddd;text-align:left;">Station</th>
              <th style="padding:8px 12px;border:1px solid #ddd;text-align:left;">Adresse</th>
              <th style="padding:8px 12px;border:1px solid #ddd;text-align:center;">Signalements</th>
              <th style="padding:8px 12px;border:1px solid #ddd;text-align:left;">Raison principale</th>
              <th style="padding:8px 12px;border:1px solid #ddd;text-align:left;">Derniers prix</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <p style="margin-top:24px;font-size:12px;color:#888;">
          Ce rapport est généré automatiquement par la carte interactive
          <a href="https://essence-qc-19129.web.app">Régie Essence Québec</a>.
          Les signalements proviennent d'utilisateurs de la communauté.
        </p>
      </div>
    `;

    // Write to the mail collection for the Trigger Email extension
    await db.collection("mail").add({
      to: ["req_enquete@regie-energie.qc.ca"],
      message: {
        subject: `Régie Essence Québec — Rapport hebdomadaire (${fmt(weekAgo)} au ${fmt(now)})`,
        html,
      },
    });

    console.log(
      `Digest envoyé : ${totalReports} signalements sur ${totalStations} stations.`
    );
  }
);
