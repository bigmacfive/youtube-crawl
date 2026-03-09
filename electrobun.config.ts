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
          "scripts/fetch-transcript.py": "next/standalone/scripts/fetch-transcript.py",
        }
      : undefined,
    mac: {
      bundleCEF: false,
      icons: "icon.iconset",
      codesign: !!process.env.ELECTROBUN_DEVELOPER_ID,
      notarize: !!process.env.ELECTROBUN_APPLEID,
    },
    linux: {
      bundleCEF: false,
    },
    win: {
      bundleCEF: false,
    },
  },
  release: {
    baseUrl: "https://github.com/bigmacfive/youtube-crawl/releases/latest/download/",
  },
} satisfies ElectrobunConfig;
