export async function webSearch(query) {
  // Mock mode: nakli results
  if (process.env.MOCK_AI === "true") {
    return [
      {
        title: "Mock Company A",
        url: "https://example.com/a",
        content: "Mock competitor that does something similar.",
      },
    ];
  }

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({ query, max_results: 5 }),
  });

  if (!res.ok) throw new Error(`Search failed: ${res.status}`);

  const data = await res.json();
  return data.results.map((r) => ({
    title: r.title,
    url: r.url,
    content: r.content,
  }));
}