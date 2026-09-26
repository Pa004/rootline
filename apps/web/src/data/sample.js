/** Shape-identical to backend analysis.json (schema_version "1.0"). */
export const SAMPLE = {
    schema_version: "1.0",
    candidates: [
        {
            commit_sha: "8a92f1c4d2e8a1b3c5d7e9f0a1b2c3d4e5f6a7b8",
            message: "tweak create user lookup",
            score: 0.3017,
            evidence: [
                { kind: "structural", points: 0.125, detail: "2 hop(s) from failing test via imports" },
                { kind: "test", points: 0.15, detail: "failing test reaches changed file via imports" },
                { kind: "semantic", points: 0.0667, detail: "message shares tokens: create, user" },
                { kind: "contradiction", points: -0.04, detail: "1 passing test file(s) also changed" },
            ],
        },
        {
            commit_sha: "f6b72bde8070112233445566778899aabbccddeeff",
            message: "update docs",
            score: 0.2,
            evidence: [{ kind: "temporal", points: 0.2, detail: "commit #1 of 2 in window" }],
        },
    ],
};
