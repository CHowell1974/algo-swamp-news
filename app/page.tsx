async function getNews() {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return [];
  }

  const res = await fetch(
    `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`,
    { next: { revalidate: 300 } } // refresh every 5 minutes
  );

  if (!res.ok) return [];
  const data = await res.json();
  return data.slice(0, 20); // show latest 20 headlines
}

export default async function Home() {
  const news = await getNews();

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-10">
      <h1 className="text-4xl font-bold mb-2">ALGO Swamp News</h1>
      <p className="text-gray-400 mb-8">Latest financial headlines</p>

      {news.length === 0 ? (
        <p className="text-red-400">News is loading or API key is missing. Check back soon.</p>
      ) : (
        <div className="space-y-6">
          {news.map((item: any) => (
            <div key={item.id} className="border-b border-gray-800 pb-6">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xl font-semibold hover:text-blue-400 transition"
              >
                {item.headline}
              </a>
              <p className="text-sm text-gray-500 mt-1">
                {item.source} • {new Date(item.datetime * 1000).toLocaleString()}
              </p>
              {item.summary && (
                <p className="text-gray-300 mt-2 text-sm leading-relaxed">{item.summary}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}