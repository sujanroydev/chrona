const back = document.querySelector("#back");

back.addEventListener("click", () => {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  window.location.href = "index.html";
});

document.querySelectorAll('a[href^="http://"], a[href^="https://"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    window.chrona.openExternal(link.href);
  });
});
