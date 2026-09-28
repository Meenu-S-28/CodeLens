import type { DetectionEvidence } from "./detection.types.js";

export interface ArchitectureDetection {
  architecture: "MERN" | null;
  evidence: DetectionEvidence[];
}

interface ArchitectureInputs {
  runtime: string | null;
  frontend: string | null;
  backend: string | null;
  database: string | null;
}

export class ArchitectureDetector {
  detect(
    input: ArchitectureInputs
  ): ArchitectureDetection {
    const isMern =
      input.runtime === "Node.js" &&
      input.frontend === "React" &&
      input.backend === "Express" &&
      input.database === "MongoDB";

    if (!isMern) {
      return {
        architecture: null,
        evidence: [],
      };
    }

    return {
      architecture: "MERN",
      evidence: [
        {
          category: "architecture",
          technology: "MERN",
          source: "derived",
          detail:
            "Node.js + Express + React + MongoDB detected across project units",
          confidence: "HIGH",
          evidenceType: "config",
        },
      ],
    };
  }
}

export const architectureDetector =
  new ArchitectureDetector();