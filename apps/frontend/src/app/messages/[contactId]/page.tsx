import { UltraTelegramChat } from "../../../components/UltraTelegramChat";

type ContactChatPageProps = {
  params: Promise<{
    contactId: string;
  }>;
};

export default async function ContactChatPage({ params }: ContactChatPageProps) {
  const { contactId } = await params;
  return <UltraTelegramChat contactId={contactId} />;
}
