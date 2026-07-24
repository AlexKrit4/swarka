"use client";

import type { NavItem } from "@swarka/shared";

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {multiline ? (
        <textarea
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}

export function SectionHeadingFields({
  title,
  value,
  onChange,
  withSubtitle = true,
}: {
  title: string;
  value: { eyebrow: string; title: string; subtitle?: string };
  onChange: (value: { eyebrow: string; title: string; subtitle?: string }) => void;
  withSubtitle?: boolean;
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">{title}</h3>
      <TextField
        label="Надпись сверху"
        value={value.eyebrow}
        onChange={(eyebrow) => onChange({ ...value, eyebrow })}
      />
      <TextField
        label="Заголовок"
        value={value.title}
        onChange={(titleValue) => onChange({ ...value, title: titleValue })}
      />
      {withSubtitle && (
        <TextField
          label="Подзаголовок"
          value={value.subtitle ?? ""}
          onChange={(subtitle) => onChange({ ...value, subtitle })}
        />
      )}
    </div>
  );
}

export function NavItemsEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: NavItem[];
  onChange: (items: NavItem[]) => void;
}) {
  const updateItem = (index: number, patch: Partial<NavItem>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{label}</h3>
        <button
          type="button"
          className="text-sm text-blue-600 hover:underline"
          onClick={() => onChange([...items, { label: "", href: "" }])}
        >
          + Добавить
        </button>
      </div>
      {items.map((item, index) => (
        <div key={index} className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <TextField
            label="Текст"
            value={item.label}
            onChange={(labelValue) => updateItem(index, { label: labelValue })}
          />
          <TextField
            label="Ссылка"
            value={item.href}
            onChange={(href) => updateItem(index, { href })}
          />
          <button
            type="button"
            className="text-sm text-red-600 hover:underline px-2 py-2"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            Удалить
          </button>
        </div>
      ))}
    </div>
  );
}

export function StringListEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{label}</h3>
        <button
          type="button"
          className="text-sm text-blue-600 hover:underline"
          onClick={() => onChange([...items, ""])}
        >
          + Добавить
        </button>
      </div>
      {items.map((item, index) => (
        <div key={index} className="flex gap-2">
          <input
            className="flex-1"
            value={item}
            onChange={(e) =>
              onChange(items.map((value, i) => (i === index ? e.target.value : value)))
            }
          />
          <button
            type="button"
            className="text-sm text-red-600 hover:underline px-2"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function VisibilityToggles({
  value,
  onChange,
}: {
  value: Record<string, boolean>;
  onChange: (value: Record<string, boolean>) => void;
}) {
  const labels: Record<string, string> = {
    services: "Услуги",
    portfolio: "Портфолио",
    promo: "Акция",
    whyUs: "Преимущества",
    reviews: "Отзывы",
    faq: "FAQ",
    calculator: "Калькулятор",
    mobileCta: "Мобильные кнопки",
  };

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {Object.entries(labels).map(([key, label]) => (
        <label key={key} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value[key] ?? true}
            onChange={(e) => onChange({ ...value, [key]: e.target.checked })}
          />
          {label}
        </label>
      ))}
    </div>
  );
}
