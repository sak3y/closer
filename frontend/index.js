const form = document.querySelector("#question-form");
const question = document.querySelector("#question");
const button = form.querySelector("button");
const status = document.querySelector("#status");
const answer = document.querySelector("#answer");
const sources = document.querySelector("#sources");
// Live Server uses port 5500; FastAPI serves requests on port 8000.
const apiUrl = window.location.port === "5500"
  ? `${window.location.protocol}//${window.location.hostname}:8000`
  : window.location.origin;

question.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    form.requestSubmit();
  }
});

// The API retrieves vector-store passages, then asks Ollama to answer from them.
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = question.value.trim();
  if (!query || button.disabled) return;

  button.disabled = true;
  status.textContent =
    "Searching legislation and waiting for the local model...";
  answer.textContent = "";
  sources.replaceChildren();

  try {
    const response = await fetch(`${apiUrl}/ask?${new URLSearchParams({ query })}`);
    if (!response.ok) {
      throw new Error(
        response.status === 429
          ? "Too many questions. Please wait a minute and try again."
          : "Request failed. Check that Ollama is running, both models are installed and the vector store is indexed.",
      );
    }
    const data = await response.json();
    answer.textContent = data.answer;

    // Use textContent so model output and source passages are displayed as text.
    for (const source of data.sources) {
      const card = document.createElement("article");
      const passage = document.createElement("p");
      passage.textContent = source.text;
      card.append(passage);

      // Published legislation may use HTTP; link to its HTTPS equivalent.
      try {
        const url = new URL(source.uri);
        if (
          ["http:", "https:"].includes(url.protocol) &&
          ["legislation.gov.uk", "www.legislation.gov.uk"].includes(
            url.hostname,
          )
        ) {
          url.protocol = "https:";
          const link = document.createElement("a");
          link.href = url.href;
          link.textContent = "Read legislation →";
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          card.append(link);
        }
      } catch {
        // Keep the passage visible even if its source URL is invalid.
      }
      sources.append(card);
    }
    if (!data.sources.length) sources.textContent = "No sources found.";
    status.textContent = "Research complete.";
  } catch (error) {
    status.textContent =
      error instanceof TypeError
        ? "Cannot reach the API. Start FastAPI and open this page at http://localhost:8000."
        : error.message;
  } finally {
    button.disabled = false;
  }
});
