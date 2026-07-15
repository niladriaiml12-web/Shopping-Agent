"use client";

import React from "react";
import { 
  Search, 
  MessageSquareCode, 
  SlidersHorizontal, 
  Leaf, 
  ScanEye, 
  Zap 
} from "lucide-react";

export default function Features() {
  const items = [
    {
      icon: <Search className="h-6 w-6 text-blue-600" />,
      title: "Find Jo Sach Mein Worth It Hai",
      desc: "Instant search across premium natural products with AI matching filters.",
    },
    {
      icon: <MessageSquareCode className="h-6 w-6 text-cyan-500" />,
      title: "Log Kya Bol Rahe Hain",
      desc: "AI filters out spam reviews and extracts pure sentiment from buyer ratings.",
    },
    {
      icon: <SlidersHorizontal className="h-6 w-6 text-emerald-500" />,
      title: "Paisa Bachana Ek Talent Hai",
      desc: "Filter down by maximum pricing limit and get the absolute best value match.",
    },
    {
      icon: <Leaf className="h-6 w-6 text-green-500" />,
      title: "Organic Products",
      desc: "Dedicated filters for certified organic ingredients and raw extracts.",
    },
    {
      icon: <ScanEye className="h-6 w-6 text-purple-500" />,
      title: "Photo Phenko (Image Scan)",
      desc: "Upload a picture of a bottle or label, and our Vision AI analyzes it instantly.",
    },
    {
      icon: <Zap className="h-6 w-6 text-amber-500" />,
      title: "Le Bhai, Order Kar",
      desc: "Place orders instantly through natural chat confirmation. No multi-step forms.",
    },
  ];

  return (
    <section className="mt-20">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-3xl font-bold tracking-tight text-[#1E293B] sm:text-4xl">
          Shopping Assistent Ke Solid Features
        </h2>
        <p className="mt-3 text-lg text-[#64748B]">
          Hum simple kaam karte hain. Fast search, smart filters, direct checkout.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <div
            key={i}
            className="group relative bg-white border border-[#E5E7EB] rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-blue-200"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 group-hover:bg-blue-50 transition-colors">
              {item.icon}
            </div>
            <h3 className="mt-4 text-base font-bold text-[#1E293B]">
              {item.title}
            </h3>
            <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
