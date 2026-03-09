/// <reference types="bun-types" />

import type { ElectrobunConfig } from "electrobun";

const shouldBundleNext = process.env.ELECTROBUN_BUNDLE_NEXT === "1";

export default {
  app: {
    name: "Transcript Desk",
    identifier: "com.manzi.transcriptdesk",
    version: "0.1.0",
    description: "A local-first AI workspace for YouTube transcripts.",
  },
  build: {
    bun: {
      entrypoint: "src/bun/index.ts",
    },
    copy: shouldBundleNext
      ? {
          ".next/standalone": "next/standalone",
          ".next/static": "next/standalone/.next/static",
          public: "next/standalone/public",
        }
      : undefined,
    mac: {
      bundleCEF: false,
      codesign: false,
      notarize: false,
    },
    linux: {
      bundleCEF: false,
    },
    win: {
      bundleCEF: false,
    },
  },
} satisfies ElectrobunConfig;
