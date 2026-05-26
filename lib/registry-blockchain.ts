/**
 * 등기변동 모니터링 — 블록체인 암호화 기법 모듈
 * ─────────────────────────────────────────────────
 * 해시 체인 + 머클 트리 + Ed25519 서명 + AES-256-GCM 암호화
 *
 * 외부 패키지 없이 Node.js crypto 모듈 + 기존 MerkleTree 클래스만 사용.
 * 실제 블록체인 네트워크 불필요.
 */

import crypto from "crypto";
import { MerkleTree } from "@/lib/integrity-chain";
import { encryptPII, decryptPII } from "@/lib/crypto";

// ── 타입 ──

export interface SectionHashes {
  section: string;
  hash: string;
}

export interface RegistrySnapshot {
  monitoredPropertyId: string;
  sequenceNo: number;
  merkleRoot: string;
  snapshotHash: string;
  previousSnapshotHash: string | null;
  signature: string;
  encryptedData: string;
  sectionHashes: SectionHashes[];
  timestamp: Date;
}

export interface SectionChanges {
  section: string;
  changed: boolean;
}

export interface ChainVerificationResult {
  isValid: boolean;
  totalSnapshots: number;
  merkleRootsValid: boolean;
  hashChainValid: boolean;
  signaturesValid: boolean;
  brokenAt: number | null; // sequenceNo where chain breaks, null if valid
}

export interface RegistrySections {
  title: string;
  exclusive: string;
  gapgu: string;
  eulgu: string;
}

// ── Ed25519 키 관리 ──

function getSigningSeed(): Buffer {
  const seed = process.env.REGISTRY_SIGNING_SEED;
  if (!seed) {
    throw new Error("REGISTRY_SIGNING_SEED 환경변수가 설정되지 않았습니다.");
  }
  // seed → SHA-256 → 32바이트 (Ed25519 시드)
  return crypto.createHash("sha256").update(seed).digest();
}

function getKeyPair(): { privateKey: crypto.KeyObject; publicKey: crypto.KeyObject } {
  const seed = getSigningSeed();
  const privateKey = crypto.createPrivateKey({
    key: Buffer.concat([
      // Ed25519 PKCS#8 prefix (16 bytes) + 32-byte seed
      Buffer.from("302e020100300506032b657004220420", "hex"),
      seed,
    ]),
    format: "der",
    type: "pkcs8",
  });
  const publicKey = crypto.createPublicKey(privateKey);
  return { privateKey, publicKey };
}

/**
 * 검증용 공개키 내보내기 (PEM)
 */
export function exportPublicKey(): string {
  const { publicKey } = getKeyPair();
  return publicKey.export({ type: "spki", format: "pem" }) as string;
}

// ── 해시 유틸 ──

function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

// ── 등기부 섹션 파서 ──

/**
 * 등기부 전문을 섹션별로 분리
 * - title: 표제부
 * - exclusive: 전유부분
 * - gapgu: 갑구 (소유권)
 * - eulgu: 을구 (소유권 이외)
 */
export function splitRegistryIntoSections(text: string): RegistrySections {
  const sections: RegistrySections = {
    title: "",
    exclusive: "",
    gapgu: "",
    eulgu: "",
  };

  if (!text) return sections;

  // 섹션 마커 위치 찾기
  const titleStart = text.search(/【\s*표\s*제\s*부\s*】/);
  const exclusiveStart = text.search(/【\s*전유부분\s*】/);
  const gapguStart = text.search(/【\s*갑\s*구\s*】/);
  const eulguStart = text.search(/【\s*을\s*구\s*】/);

  // 각 섹션 추출 (마커 기준으로 다음 마커까지)
  const markers = [
    { name: "title" as const, pos: titleStart },
    { name: "exclusive" as const, pos: exclusiveStart },
    { name: "gapgu" as const, pos: gapguStart },
    { name: "eulgu" as const, pos: eulguStart },
  ]
    .filter((m) => m.pos >= 0)
    .sort((a, b) => a.pos - b.pos);

  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].pos;
    const end = i + 1 < markers.length ? markers[i + 1].pos : text.length;
    sections[markers[i].name] = text.slice(start, end).trim();
  }

  // 어떤 마커도 없으면 전체를 title로
  if (markers.length === 0) {
    sections.title = text.trim();
  }

  return sections;
}

// ── 스냅샷 생성 ──

interface CreateSnapshotParams {
  monitoredPropertyId: string;
  fullText: string;
  sequenceNo: number;
  previousSnapshotHash: string | null;
}

/**
 * 등기부 전문으로부터 암호화 스냅샷 생성
 *
 * 1. 섹션 분리 → 각 섹션 SHA-256 해시
 * 2. 섹션 해시들로 머클 트리 빌드 → merkleRoot
 * 3. snapshotHash = SHA-256(merkleRoot + prevHash + timestamp + propertyId)
 * 4. Ed25519 서명
 * 5. AES-256-GCM 암호화 (전문)
 */
export async function createSnapshot(
  params: CreateSnapshotParams
): Promise<RegistrySnapshot> {
  const { monitoredPropertyId, fullText, sequenceNo, previousSnapshotHash } =
    params;
  const timestamp = new Date();

  // 1. 섹션 분리 + 해시
  const sections = splitRegistryIntoSections(fullText);
  const sectionEntries = Object.entries(sections) as [string, string][];
  const sectionHashes: SectionHashes[] = sectionEntries.map(
    ([section, content]) => ({
      section,
      hash: sha256(content || "empty"),
    })
  );

  // 2. 머클 트리 (섹션 해시를 리프로)
  const tree = new MerkleTree();
  const merkleRoot = await tree.build(
    sectionHashes.map((s) => s.hash)
  );

  // 3. 스냅샷 해시 (해시 체인)
  const snapshotHash = sha256(
    [
      merkleRoot,
      previousSnapshotHash || "genesis",
      timestamp.toISOString(),
      monitoredPropertyId,
    ].join("|")
  );

  // 4. Ed25519 서명
  const { privateKey } = getKeyPair();
  const signatureBuffer = crypto.sign(
    null,
    Buffer.from(snapshotHash),
    privateKey
  );
  const signature = signatureBuffer.toString("base64");

  // 5. AES-256-GCM 암호화
  const encryptedData = encryptPII(fullText);

  return {
    monitoredPropertyId,
    sequenceNo,
    merkleRoot,
    snapshotHash,
    previousSnapshotHash,
    signature,
    encryptedData,
    sectionHashes,
    timestamp,
  };
}

// ── 섹션 변동 비교 ──

/**
 * 두 스냅샷의 섹션별 해시를 비교하여 변동된 섹션 반환
 */
export function detectSectionChanges(
  oldHashes: SectionHashes[],
  newHashes: SectionHashes[]
): SectionChanges[] {
  const oldMap = new Map(oldHashes.map((h) => [h.section, h.hash]));

  return newHashes.map((newH) => ({
    section: newH.section,
    changed: oldMap.get(newH.section) !== newH.hash,
  }));
}

/**
 * 변동된 섹션 이름만 추출
 */
export function getChangedSectionNames(
  oldHashes: SectionHashes[],
  newHashes: SectionHashes[]
): string[] {
  return detectSectionChanges(oldHashes, newHashes)
    .filter((s) => s.changed)
    .map((s) => s.section);
}

// ── 체인 검증 ──

interface StoredSnapshot {
  sequenceNo: number;
  merkleRoot: string;
  snapshotHash: string;
  previousSnapshotHash: string | null;
  signature: string;
  sectionHashes: SectionHashes[] | unknown;
  monitoredPropertyId: string;
  timestamp: Date | string;
}

/**
 * 스냅샷 체인 전체 무결성 검증
 *
 * 검증 항목:
 * 1. 해시 체인 연결 (previousSnapshotHash)
 * 2. Ed25519 서명 유효성
 * 3. 머클 루트 재계산 일치
 */
export async function verifySnapshotChain(
  snapshots: StoredSnapshot[]
): Promise<ChainVerificationResult> {
  if (snapshots.length === 0) {
    return {
      isValid: true,
      totalSnapshots: 0,
      merkleRootsValid: true,
      hashChainValid: true,
      signaturesValid: true,
      brokenAt: null,
    };
  }

  // sequenceNo 순 정렬
  const sorted = [...snapshots].sort((a, b) => a.sequenceNo - b.sequenceNo);
  const { publicKey } = getKeyPair();

  let hashChainValid = true;
  let signaturesValid = true;
  let merkleRootsValid = true;
  let brokenAt: number | null = null;

  for (let i = 0; i < sorted.length; i++) {
    const snap = sorted[i];

    // 1. 해시 체인 검증
    if (i === 0) {
      if (snap.previousSnapshotHash !== null) {
        hashChainValid = false;
        if (brokenAt === null) brokenAt = snap.sequenceNo;
      }
    } else {
      if (snap.previousSnapshotHash !== sorted[i - 1].snapshotHash) {
        hashChainValid = false;
        if (brokenAt === null) brokenAt = snap.sequenceNo;
      }
    }

    // 2. 서명 검증
    try {
      const isValid = crypto.verify(
        null,
        Buffer.from(snap.snapshotHash),
        publicKey,
        Buffer.from(snap.signature, "base64")
      );
      if (!isValid) {
        signaturesValid = false;
        if (brokenAt === null) brokenAt = snap.sequenceNo;
      }
    } catch {
      signaturesValid = false;
      if (brokenAt === null) brokenAt = snap.sequenceNo;
    }

    // 3. 머클 루트 재계산
    const hashes = Array.isArray(snap.sectionHashes)
      ? (snap.sectionHashes as SectionHashes[])
      : [];

    if (hashes.length > 0) {
      const tree = new MerkleTree();
      const recomputedRoot = await tree.build(hashes.map((h) => h.hash));
      if (recomputedRoot !== snap.merkleRoot) {
        merkleRootsValid = false;
        if (brokenAt === null) brokenAt = snap.sequenceNo;
      }
    }
  }

  return {
    isValid: hashChainValid && signaturesValid && merkleRootsValid,
    totalSnapshots: sorted.length,
    merkleRootsValid,
    hashChainValid,
    signaturesValid,
    brokenAt,
  };
}

// ── 복호화 래퍼 ──

/**
 * 스냅샷 암호화 데이터 복호화
 */
export function decryptSnapshotData(encryptedData: string): string {
  return decryptPII(encryptedData);
}

// ── 한글 섹션명 매핑 ──

const SECTION_LABELS: Record<string, string> = {
  title: "표제부",
  exclusive: "전유부분",
  gapgu: "갑구",
  eulgu: "을구",
};

/**
 * 변동 섹션 한글 라벨 반환
 */
export function getSectionLabel(section: string): string {
  return SECTION_LABELS[section] || section;
}
