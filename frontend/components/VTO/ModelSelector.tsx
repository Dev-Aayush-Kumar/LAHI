"use client";

import { useState } from "react";

export type UserModel = {
  id: string;
  name: string;
  relation: string | null;
  frontImageUrl: string | null;
};

type Props = {
  models: UserModel[];
  selected?: string;
  onSelect(id: string): void;
};

export default function ModelSelector({
  models,
  selected,
  onSelect,
}: Props) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {models.map((model) => (
        <button
          key={model.id}
          type="button"
          onClick={() => onSelect(model.id)}
          className={`overflow-hidden rounded-2xl border transition ${
            selected === model.id
              ? "border-black ring-2 ring-black"
              : "border-gray-200"
          }`}
        >
          <div className="aspect-[3/4] bg-gray-100">
            {model.frontImageUrl ? (
              <img
                src={model.frontImageUrl}
                alt={model.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                No Image
              </div>
            )}
          </div>

          <div className="p-4 text-left">
            <h3 className="font-semibold">
              {model.name}
            </h3>

            <p className="text-sm text-gray-500">
              {model.relation ?? "Person"}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}