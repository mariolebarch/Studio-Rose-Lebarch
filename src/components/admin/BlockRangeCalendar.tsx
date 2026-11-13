import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isPastDate, toDateInputValue } from "../../utils/slots";
import { weekdayShort } from "../../data/business";

interface BlockRangeCalendarProps {
  blockedSet: Set<string>;
  rangeStart: string | null;
  rangeEnd: string | null;
  onRangeChange: (start: string, end: string) => void;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function BlockRangeCalendar({ blockedSet, rangeStart, rangeEnd, onRangeChange }: BlockRangeCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const mondayFirstOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (string | null)[] = [
    ...Array.from({ length: mondayFirstOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toDateInputValue(new Date(viewYear, viewMonth, i + 1))),
  ];

  const minMonth = today.getFullYear() * 12 + today.getMonth();
  const viewingMonth = viewYear * 12 + viewMonth;

  function goPrev() {
    if (viewingMonth <= minMonth) return;
    const d = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function goNext() {
    const d = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function handlePick(date: string) {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      // Começa uma seleção nova.
      onRangeChange(date, date);
      return;
    }
    // Já tem início escolhido: define o fim (ou reinicia se clicar antes do início).
    if (date < rangeStart) {
      onRangeChange(date, rangeStart);
    } else {
      onRangeChange(rangeStart, date);
    }
  }

  return (
    <div className="rounded-2xl border border-blush-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={goPrev}
          disabled={viewingMonth <= minMonth}
          className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-blush-100 disabled:opacity-30 disabled:hover:bg-transparent text-rose-700"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="font-display text-base text-rose-800">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </p>
        <button
          type="button"
          onClick={goNext}
          className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-blush-100 text-rose-700"
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-ink-500 mb-2">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <span key={d}>{weekdayShort[d as 0 | 1 | 2 | 3 | 4 | 5 | 6]}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />;
          const past = isPastDate(date);
          const alreadyBlocked = blockedSet.has(date);
          const disabled = past || alreadyBlocked;
          const inRange = !!rangeStart && !!rangeEnd && date >= rangeStart && date <= rangeEnd;
          const isEdge = date === rangeStart || date === rangeEnd;
          const dayNum = Number(date.split("-")[2]);

          return (
            <button
              key={date}
              type="button"
              disabled={disabled}
              onClick={() => handlePick(date)}
              title={alreadyBlocked ? "Já bloqueado" : undefined}
              className={`aspect-square rounded-lg text-sm font-medium transition-colors flex items-center justify-center
                ${isEdge ? "bg-rose-600 text-white" : ""}
                ${inRange && !isEdge ? "bg-blush-200 text-rose-800" : ""}
                ${!inRange && !disabled ? "hover:bg-blush-100 text-ink-900" : ""}
                ${disabled ? "text-ink-500/30 cursor-not-allowed line-through decoration-1" : ""}
              `}
            >
              {dayNum}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-600" /> Selecionado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-ink-500/20" /> Já bloqueado / passado
        </span>
      </div>
    </div>
  );
}
