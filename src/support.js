const back = document.querySelector("#back");

back.addEventListener("click", () => {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  window.location.href = "index.html";
});
