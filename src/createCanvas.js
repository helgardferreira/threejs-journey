export default function createCanvas() {
  const canvas = document.createElement("canvas");
  canvas.classList.add("webgl");

  const container = document.getElementById("root");
  container.appendChild(canvas);

  return canvas;
}
