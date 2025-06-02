import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ShotChart() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Wait until DOM has rendered container
    requestAnimationFrame(() => {
      init3D(container);
    });
  }, []);

  function init3D(container) {
    console.log("Initializing 3D scene...");

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x001122);
    scene.fog = new THREE.Fog(0x001122, 50, 200);

    // Camera setup
    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(40, 25, 23.5);
    camera.lookAt(0, 5, 15);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const spotLight = new THREE.SpotLight(0xffd700, 0.6);
    spotLight.position.set(0, 30, 42);
    spotLight.target.position.set(0, 0, 42);
    scene.add(spotLight);
    scene.add(spotLight.target);

    // Court
    const court = new THREE.Group();
    const courtGeometry = new THREE.PlaneGeometry(50, 47);
    const courtTexture = createCourtTexture();
    courtTexture.flipY = false; // Fix orientation
    const courtMaterial = new THREE.MeshLambertMaterial({ map: courtTexture });
    const courtMesh = new THREE.Mesh(courtGeometry, courtMaterial);
    courtMesh.rotation.x = -Math.PI / 2;
    courtMesh.position.z = 23.5;
    courtMesh.receiveShadow = true;
    court.add(courtMesh);
    scene.add(court);

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }

    animate();
  }

  function createCourtTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");

    // Court background
    ctx.fillStyle = "#CD853F";
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 4;

    // Half-court arc
    ctx.beginPath();
    ctx.arc(256, 480, 60, Math.PI, 2 * Math.PI);
    ctx.stroke();

    // Three-point arc
    ctx.beginPath();
    ctx.arc(256, 30, 130, 0.15, Math.PI - 0.15);
    ctx.stroke();

    // Three-point lines
    ctx.beginPath();
    ctx.moveTo(126, 30);
    ctx.lineTo(126, 170);
    ctx.moveTo(386, 30);
    ctx.lineTo(386, 170);
    ctx.stroke();

    // Free throw circle
    ctx.beginPath();
    ctx.arc(256, 200, 60, 0, 2 * Math.PI);
    ctx.stroke();

    // Key
    ctx.strokeRect(192, 30, 128, 190);

    // Free throw line
    ctx.beginPath();
    ctx.moveTo(192, 200);
    ctx.lineTo(320, 200);
    ctx.stroke();

    // Baseline
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, 30);
    ctx.lineTo(512, 30);
    ctx.stroke();

    return new THREE.CanvasTexture(canvas);
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: "#000",
        position: "relative",
        overflow: "hidden",
      }}
    />
  );
}