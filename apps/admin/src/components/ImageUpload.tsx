"use client";

import { useState } from "react";
import { uploadFile } from "@/lib/api";

interface ImageUploadProps {
  value: string | null;
  onChange: (url: string) => void;
  label?: string;
}

export function ImageUpload({ value, onChange, label = "Изображение" }: ImageUploadProps) {
  const [loading, setLoading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const { url } = await uploadFile(file);
      onChange(url);
    } catch {
      alert("Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  const displayUrl = value?.startsWith("http")
    ? value
    : value
      ? `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}${value}`
      : null;

  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      {displayUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={displayUrl} alt="" className="w-32 h-32 object-cover rounded-lg mb-2" />
      )}
      <input
        type="file"
        accept="image/*"
        onChange={handleFile}
        disabled={loading}
        className="text-sm"
      />
      {loading && <p className="text-xs text-gray-500 mt-1">Загрузка...</p>}
      {value && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full mt-2 border rounded-lg px-3 py-2 text-sm"
          placeholder="или вставьте URL"
        />
      )}
    </div>
  );
}
