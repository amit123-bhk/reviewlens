async function handleResponse(res) {
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.error || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export async function uploadCsv(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });
  return handleResponse(res);
}

export async function fetchResults() {
  const res = await fetch("/api/results");
  if (res.status === 404) {
    return null;
  }
  return handleResponse(res);
}

export async function fetchInsights() {
  const res = await fetch("/api/insights");
  if (res.status === 404) {
    return null;
  }
  return handleResponse(res);
}

export async function generateReviewReply(reviewOrId) {
  const reviewId =
    typeof reviewOrId === "object" && reviewOrId !== null
      ? reviewOrId.review_id
      : reviewOrId;

  const res = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}/reply`, {
    method: "POST",
  });
  return handleResponse(res);
}

export const generateReply = generateReviewReply;
