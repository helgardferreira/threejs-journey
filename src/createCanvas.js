export default function createCanvas() {
  const canvas = document.createElement("canvas");

  const container = document.getElementById("root");
  container.appendChild(canvas);

  return canvas;
}
