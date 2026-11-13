export const business = {
  name: "Rosely Lebarch",
  brand: "Studio Rosely Lebarch",
  tagline: "Nails Design",
  instagramHandle: "@studioroselebarch",
  instagramUrl: "https://www.instagram.com/studioroselebarch/",
  whatsappLink: "https://bit.ly/RoselyLebarchNails",
  whatsappPhone: "5531995233503", // usado para links com mensagem pronta (o bit.ly ignora o texto)
  address: {
    street: "Rua Quartzo, 570",
    neighborhood: "Iguaçu",
    full: "Rua Quartzo, 570 — Iguaçu",
  },
  mapsEmbedSrc:
    "https://www.google.com/maps?q=" +
    encodeURIComponent("Rua Quartzo, 570, Iguaçu") +
    "&output=embed",
  mapsLink:
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent("Rua Quartzo, 570, Iguaçu"),
  bio:
    "Especialista em unhas com técnica, delicadeza e muito carinho em cada detalhe. " +
    "No Studio Rosely Lebarch você encontra alongamento, esmaltação em gel, nail art autoral " +
    "e um atendimento pensado para o seu momento de autocuidado.",
} as const;

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo

export interface DayHours {
  open: boolean;
  start: string; // "09:00"
  end: string; // "19:00"
}

export const defaultBusinessHours: Record<Weekday, DayHours> = {
  0: { open: false, start: "09:00", end: "18:00" }, // domingo
  1: { open: false, start: "09:00", end: "19:00" }, // segunda
  2: { open: true, start: "09:00", end: "19:00" }, // terça
  3: { open: true, start: "09:00", end: "19:00" }, // quarta
  4: { open: true, start: "09:00", end: "19:00" }, // quinta
  5: { open: true, start: "09:00", end: "19:00" }, // sexta
  6: { open: true, start: "09:00", end: "17:00" }, // sábado
};

export const weekdayNames: Record<Weekday, string> = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

export const weekdayShort: Record<Weekday, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};
