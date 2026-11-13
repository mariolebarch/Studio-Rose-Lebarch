import { business } from "../data/business";
import { formatDateBR } from "./slots";

export function buildWhatsAppMessage(params: {
  serviceNames: string[];
  date: string;
  startTime: string;
  clientName: string;
}) {
  const { serviceNames, date, startTime, clientName } = params;
  const text =
    `Olá, Rosely! 💅 Meu nome é ${clientName}.\n` +
    `Gostaria de confirmar meu agendamento:\n\n` +
    `Procedimento(s): ${serviceNames.join(" + ")}\n` +
    `Data: ${formatDateBR(date)}\n` +
    `Horário: ${startTime}\n\n` +
    `Fico no aguardo da confirmação. Obrigada!`;
  return text;
}

export function buildReminderMessage(params: {
  serviceNames: string[];
  date: string;
  startTime: string;
  clientName: string;
}) {
  const { serviceNames, date, startTime, clientName } = params;
  return (
    `Oi, ${clientName}! 💅 Aqui é a Rosely, do Studio Rosely Lebarch.\n` +
    `Passando para lembrar do seu horário:\n\n` +
    `Procedimento(s): ${serviceNames.join(" + ")}\n` +
    `Data: ${formatDateBR(date)}\n` +
    `Horário: ${startTime}\n\n` +
    `Te espero! Qualquer imprevisto, é só me avisar por aqui. 😊`
  );
}

export function whatsappLinkToPhone(phone: string, message?: string) {
  const digits = phone.replace(/\D/g, "");
  return message
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${digits}`;
}

export function whatsappLinkWithMessage(message?: string) {
  // O link curto (bit.ly) tem uma mensagem fixa configurada nele e ignora
  // qualquer texto que a gente tente anexar — por isso, sempre que há uma
  // mensagem específica (ex.: confirmação de agendamento), usamos o link
  // direto do WhatsApp com o número do studio, sem passar pelo bit.ly.
  if (!message) return business.whatsappLink;
  return whatsappLinkToPhone(business.whatsappPhone, message);
}
