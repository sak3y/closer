const form = document.getElementById("question-form");
const questionInput = document.getElementById("question");
const response = document.getElementById("response");
const submitButton = document.getElementById("submit-btn");

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const question = questionInput.value.trim();

  if (!question) return;

  submitButton.disabled = true;
  submitButton.textContent = "Processing...";

  response.textContent =
    `Question received: ${question}\n\n` +
    "The RAG backend is not connected yet.";

  submitButton.disabled = false;
  submitButton.textContent = "Ask Question";
});
