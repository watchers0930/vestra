const COMPRESS_THRESHOLD = 4 * 1024 * 1024; // 4MB
const MAX_COMPRESSED_SIZE = 4 * 1024 * 1024;

export async function uploadFile(file: File): Promise<Response> {
  if (file.size <= COMPRESS_THRESHOLD) {
    const formData = new FormData();
    formData.append("file", file);
    return fetch("/api/feasibility/parse", { method: "POST", body: formData });
  }

  if (typeof CompressionStream === "undefined") {
    throw new Error(
      `${file.name}: 파일 크기(${(file.size / 1024 / 1024).toFixed(1)}MB)가 서버 제한을 초과합니다. ` +
      "최신 브라우저를 사용하거나 파일 크기를 4MB 이하로 줄여주세요."
    );
  }

  const compressed = await new Response(
    file.stream().pipeThrough(new CompressionStream("gzip"))
  ).arrayBuffer();

  if (compressed.byteLength > MAX_COMPRESSED_SIZE) {
    throw new Error(
      `${file.name}: 파일이 너무 큽니다 (압축 후 ${(compressed.byteLength / 1024 / 1024).toFixed(1)}MB). ` +
      "4MB 이하의 파일을 사용해주세요."
    );
  }

  return fetch("/api/feasibility/parse", {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "X-File-Name": encodeURIComponent(file.name),
      "X-Compressed": "gzip",
    },
    body: compressed,
  });
}
