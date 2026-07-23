"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SafetyDoc } from "../components/SafetySection";

export type ListingFormData = {
  listingType: "JEONSE" | "SALE";
  address: string;
  detailAddress: string;
  roomType: string;
  size: string;
  floor: string;
  totalFloor: string;
  deposit: string;
  managementFee: string;
  duration: string;
  availableFrom: string;
  description: string;
};

const INITIAL: ListingFormData = {
  listingType: "JEONSE",
  address: "",
  detailAddress: "",
  roomType: "",
  size: "",
  floor: "",
  totalFloor: "",
  deposit: "",
  managementFee: "",
  duration: "12",
  availableFrom: "",
  description: "",
};

export function useListingForm() {
  const router = useRouter();
  const [form, setForm] = useState<ListingFormData>(INITIAL);
  const [photos, setPhotos] = useState<string[]>([]);
  const [analysisId, setAnalysisId] = useState("");
  const [safetyDocs, setSafetyDocs] = useState<SafetyDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function set(field: keyof ListingFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function uploadPhoto(file: File) {
    if (photos.length >= 10) {
      setError("사진은 최대 10장까지 업로드 가능합니다.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/listings/temp-photo", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "업로드에 실패했습니다.");
      }
      const { url } = await res.json();
      setPhotos((prev) => [...prev, url]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 오류");
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit() {
    setError("");
    if (!form.address.trim()) { setError("주소를 입력해주세요."); return; }
    const depositNum = Number(form.deposit.replace(/,/g, ""));
    if (!depositNum || depositNum <= 0) { setError("보증금/매매가를 입력해주세요."); return; }

    setSubmitting(true);
    try {
      const fullAddress = form.address.trim() +
        (form.detailAddress.trim() ? ` ${form.detailAddress.trim()}` : "");
      const body = {
        listingType: form.listingType,
        address: fullAddress,
        roomType: form.roomType || undefined,
        size: form.size ? Number(form.size) : undefined,
        floor: form.floor ? Number(form.floor) : undefined,
        totalFloor: form.totalFloor ? Number(form.totalFloor) : undefined,
        deposit: depositNum,
        managementFee: form.managementFee ? Number(form.managementFee.replace(/,/g, "")) : undefined,
        duration: form.listingType === "JEONSE" && form.duration ? Number(form.duration) : undefined,
        availableFrom: form.availableFrom ? new Date(form.availableFrom).toISOString() : undefined,
        description: form.description || undefined,
        photos: photos.length > 0 ? photos : undefined,
        analysisId: analysisId || undefined,
        safetyDocuments: safetyDocs.length > 0 ? safetyDocs : undefined,
      };
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "등록에 실패했습니다.");
      }
      const { listing } = await res.json();
      router.push(`/listings/${listing.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "등록 오류");
      setSubmitting(false);
    }
  }

  return {
    form, set,
    photos, uploading, uploadPhoto, removePhoto,
    analysisId, setAnalysisId,
    safetyDocs, setSafetyDocs,
    submitting, error, submit,
  };
}
