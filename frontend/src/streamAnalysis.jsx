// Reads the SSE stream from a POST request, because EventSource can't send headers
export async function streamAnalysis(authFetch, idea, onEvent, signal) {
  const res = await authFetch("/analyze-stream", {
    method: "POST",
    body: JSON.stringify({ idea }),
    signal,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Request failed");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Events are separated by a blank line. The last piece may be incomplete
    const parts = buffer.split("\n\n");
    buffer = parts.pop();

    for (const part of parts) {
      let event = "message";
      let data = "";
      for (const line of part.split("\n")) {
        if (line.startsWith("event: ")) event = line.slice(7);
        else if (line.startsWith("data: ")) data += line.slice(6);
      }
      if (data) onEvent(event, JSON.parse(data));
    }
  }
}