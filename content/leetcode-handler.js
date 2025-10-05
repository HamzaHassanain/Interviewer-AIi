function isCodeWidget(widget) {
  const titleElement = widget.querySelector(".view-lines");
  return Boolean(titleElement);
}
function isTestResultWidget(widget) {
  return widget.innerHTML.includes("You must run your code first");
}

function destroyAllLeetcodeWidgetsExceptCode() {
  // chose all elemnets with data attribute called data-layout-path

  const widgets = document.querySelectorAll(".flexlayout__tab");
  widgets.forEach((widget) => {
    if (isCodeWidget(widget)) return;
    if (isTestResultWidget(widget)) return;
    widget.remove();
  });
}

function getLeetcodeProblemTitleAndLink() {
  // from window url

  const url = window.location.href;
  const title = document.title;
  // remove anything after ?

  const cleanUrl = url.split("?")[0].trim();
  return `Title: ${title}, Link: ${cleanUrl}`;
}
