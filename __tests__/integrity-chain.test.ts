/**
 * lib/integrity-chain.ts 테스트
 * MerkleTree 및 IntegrityChain 무결성 검증
 */
import { describe, it, expect } from "vitest";
import { MerkleTree, IntegrityChain } from "@/lib/integrity-chain";

// ============================================================
// MerkleTree
// ============================================================

describe("MerkleTree", () => {
  it("결정론적 루트: 동일 데이터 -> 동일 루트 해시", async () => {
    const data = ["alpha", "beta", "gamma", "delta"];

    const tree1 = new MerkleTree();
    const root1 = await tree1.build(data);

    const tree2 = new MerkleTree();
    const root2 = await tree2.build(data);

    expect(root1).toBe(root2);
    expect(typeof root1).toBe("string");
    expect(root1.length).toBeGreaterThan(0);
  });

  it("proof 검증: 4개 리프로 트리 구축 후 getProof(0) -> verifyProof true", async () => {
    const tree = new MerkleTree();
    await tree.build(["a", "b", "c", "d"]);

    const proof = tree.getProof(0);
    expect(proof.leafIndex).toBe(0);
    expect(proof.root).toBe(tree.getRootHash());

    const isValid = await MerkleTree.verifyProof(proof);
    expect(isValid).toBe(true);
  });

  it("홀수 리프: 3개 아이템으로 트리 구축 -> 정상 동작, 유효한 루트 해시", async () => {
    const tree = new MerkleTree();
    const root = await tree.build(["x", "y", "z"]);

    expect(typeof root).toBe("string");
    expect(root.length).toBeGreaterThan(0);
    expect(root).toBe(tree.getRootHash());
  });

  it("빈 데이터: build([]) -> 에러 발생", async () => {
    const tree = new MerkleTree();

    await expect(tree.build([])).rejects.toThrow(
      "Cannot build Merkle Tree with empty data"
    );
  });
});

// ============================================================
// IntegrityChain
// ============================================================

describe("IntegrityChain", () => {
  it("3단계 추가 -> finalize -> verify: 무결성 보고서 정상", async () => {
    const chain = new IntegrityChain("test-chain");

    await chain.addStep("step1", { a: 1 }, { b: 2 });
    await chain.addStep("step2", { b: 2 }, { c: 3 });
    await chain.addStep("step3", { c: 3 }, { d: 4 });

    const merkleRoot = await chain.finalize();
    expect(typeof merkleRoot).toBe("string");
    expect(merkleRoot.length).toBeGreaterThan(0);

    const report = await chain.verify();
    expect(report.isValid).toBe(true);
    expect(report.totalSteps).toBe(3);
    expect(report.merkleRootValid).toBe(true);
    expect(report.chainLinksValid).toBe(true);
    expect(report.brokenLinks).toHaveLength(0);
    expect(report.tamperedSteps).toHaveLength(0);
  });

  it("finalize 전 verify: isFinalized === false", () => {
    const chain = new IntegrityChain("pre-finalize");
    const info = chain.getChainInfo();

    expect(info.isFinalized).toBe(false);
    expect(info.merkleRoot).toBeNull();
  });

  it("finalized 후 addStep 금지: 에러 발생", async () => {
    const chain = new IntegrityChain("finalized-chain");
    await chain.addStep("only-step", { in: 1 }, { out: 2 });
    await chain.finalize();

    await expect(
      chain.addStep("extra-step", { in: 3 }, { out: 4 })
    ).rejects.toThrow("Cannot add steps to a finalized chain");
  });

  it("빈 체인 finalize 금지: 에러 발생", async () => {
    const chain = new IntegrityChain("empty-chain");

    await expect(chain.finalize()).rejects.toThrow(
      "Cannot finalize empty chain"
    );
  });
});
