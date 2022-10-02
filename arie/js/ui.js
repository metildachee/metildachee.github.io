const cmykCb = document.getElementById("cmyk-cb");
const hsvCb = document.getElementById("hsv-cb");
const conCb = document.getElementById("convolute-cb");
const boxCb = document.getElementById("boxblur-cb");
const motionCb = document.getElementById("motiondetection-cb");

const hue = document.getElementById("hue");
const saturation = document.getElementById("saturation");
const value = document.getElementById("value");

const cyan = document.getElementById("cyan");
const magenta = document.getElementById("magenta");
const yellow = document.getElementById("yellow");
const key = document.getElementById("key");

pipelineCb.addEventListener("click", () => {
  cmykCb.disabled = !cmykCb.disabled;
  hsvCb.disabled = !hsvCb.disabled;
  conCb.disabled = !conCb.disabled;
  boxCb.disabled = !boxCb.disabled;
  motionCb.disabled = !motionCb.disabled;
});

cmykCb.addEventListener("click", () => {
  cyan.disabled = !cyan.disabled;
  magenta.disabled = !magenta.disabled;
  yellow.disabled = !yellow.disabled;
  key.disabled = !key.disabled;
});

hsvCb.addEventListener("click", () => {
  hue.disabled = !hue.disabled;
  saturation.disabled = !saturation.disabled;
  value.disabled = !value.disabled;
});

// For draggable filters, see: https://codepen.io/WebDevSimplified/pen/JjdveeV
const draggables = document.querySelectorAll(".draggable");
const containers = document.querySelectorAll(".container");

draggables.forEach((draggable) => {
  draggable.addEventListener("dragstart", (e) => {
    draggable.classList.add("dragging");
  });

  draggable.addEventListener("dragend", (e) => {
    draggable.classList.remove("dragging");
  });
});

containers.forEach((container) => {
  container.addEventListener("dragover", (e) => {
    e.stopPropagation();
    const afterElement = getDragAfterElement(container, e.clientY);
    const draggable = document.querySelector(".dragging");
    if (afterElement == null) {
      container.appendChild(draggable);
    } else {
      container.insertBefore(draggable, afterElement);
    }
  });
});

function getDragAfterElement(container, y) {
  const draggableElements = [
    ...container.querySelectorAll(".draggable:not(.dragging)"),
  ];

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}
