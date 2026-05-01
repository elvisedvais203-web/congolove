"use client";

import { AuthGuard } from "../../../components/nextalkauthguard";
import { SectionHeader } from "../../../components/nextalksectionheader";
import dynamic from "next/dynamic";

const NextalkChat = dynamic(
  () => import("../../../components/nextalkchat").then((module) => module.NextalkChat)
);

export default function ArchivedMessagesPage() {
  return (
    <AuthGuard>
      <section className="space-y-4 animate-fade-in pb-2">
        <SectionHeader title="Archives" accent="blue" />
        <div className="glass neon-border rounded-3xl p-3">
          <NextalkChat initialShowArchived />
        </div>
      </section>
    </AuthGuard>
  );
}
