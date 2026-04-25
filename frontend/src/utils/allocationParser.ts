/**
 * Allocation Parsing Utility
 * Extracts portfolio allocations from agent messages
 */

import type { AssetAllocation } from "./chartUtils";

// Color scheme matching the theme
const ALLOCATION_COLORS = {
  blend: "#8b5cf6", // Purple/Primary
  soroswap: "#06b6d4", // Cyan/Secondary
  gold: "#f59e0b", // Amber/Gold
  usdc: "#8b5cf6", // Default to primary
  xlm: "#06b6d4", // Default to secondary
};

/**
 * Extract allocations from agent message using pattern matching
 */
export function parseAllocationsFromMessage(
  message: string,
): AssetAllocation[] | null {
  const allocations: AssetAllocation[] = [];

  // Pattern 1: "X% to Asset Name" or "allocate X% to Asset"
  const percentPattern =
    /(\d+(?:\.\d+)?)\s*%\s*(?:to\s+)?([^,.—•\n]+?)(?:\s*\b(?:for|with|to)\b|$|[,.—•\n])/gi;

  let match;
  let totalPercentage = 0;

  while ((match = percentPattern.exec(message)) !== null) {
    const percentage = parseFloat(match[1]);
    const assetName = match[2]
      .trim()
      .replace(/and\s+/, "")
      .replace(/\s+yield$/, "")
      .replace(/\s+strategy$/, "")
      .trim();

    // Skip very short descriptions (likely parsing error)
    if (assetName.length < 3) continue;

    // Determine color based on asset name
    const color = getColorForAsset(assetName);

    allocations.push({
      name: assetName,
      percentage,
      color,
    });

    totalPercentage += percentage;
  }

  // Only return if we parsed something and it roughly sums to 100%
  if (
    allocations.length > 0 &&
    totalPercentage >= 90 &&
    totalPercentage <= 110
  ) {
    // Normalize to exactly 100%
    const scale = 100 / totalPercentage;
    return allocations.map((a) => ({
      ...a,
      percentage: Math.round(a.percentage * scale * 100) / 100,
    }));
  }

  return null;
}

/**
 * Determine color based on asset name keywords
 */
function getColorForAsset(assetName: string): string {
  const lower = assetName.toLowerCase();

  if (lower.includes("blend")) return ALLOCATION_COLORS.blend;
  if (lower.includes("soroswap") || lower.includes("lp"))
    return ALLOCATION_COLORS.soroswap;
  if (lower.includes("gold") || lower.includes("xaut"))
    return ALLOCATION_COLORS.gold;
  if (lower.includes("usdc")) return ALLOCATION_COLORS.usdc;
  if (lower.includes("xlm")) return ALLOCATION_COLORS.xlm;

  // Cycle through colors for unknown assets
  const colors = Object.values(ALLOCATION_COLORS);
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Get default allocations
 */
export function getDefaultAllocations(): AssetAllocation[] {
  return [
    {
      name: "Blend Protocol Yield (USDC)",
      percentage: 60,
      color: ALLOCATION_COLORS.blend,
    },
    {
      name: "Soroswap LP (XLM/USDC)",
      percentage: 30,
      color: ALLOCATION_COLORS.soroswap,
    },
    {
      name: "Stellar Anchored Gold (XAUT)",
      percentage: 10,
      color: ALLOCATION_COLORS.gold,
    },
  ];
}
