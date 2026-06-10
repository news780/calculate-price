import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { DieLineGeometry, PackageLayoutResult } from '../types/layout';

interface LayoutPreview3DProps {
  result: PackageLayoutResult;
}

const PAPER_THICKNESS = 0.025;
const PIECE_THICKNESS = 0.045;
const MAX_RENDERED_PIECES = 600;
const CAMERA_PADDING = 1.4;
const INITIAL_ROTATION_X = -0.9;
const INITIAL_ROTATION_Y = 0.45;

function createBox(width: number, depth: number, height: number, color: string, opacity = 1): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.04,
    transparent: opacity < 1,
    opacity,
  });

  return new THREE.Mesh(geometry, material);
}

function createDielineMesh(dieline: DieLineGeometry, scale: number): THREE.Mesh {
  const shape = new THREE.Shape();

  dieline.outline.forEach((point, index) => {
    const x = point.x * scale;
    const y = point.y * scale;

    if (index === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  });
  shape.closePath();

  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);

  return new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: '#2563eb',
      roughness: 0.76,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
  );
}

function addEdges(mesh: THREE.Mesh, group: THREE.Group, color = '#334155') {
  const edges = new THREE.EdgesGeometry(mesh.geometry);
  const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color }));
  line.position.copy(mesh.position);
  group.add(line);
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;

    if (mesh.geometry) {
      mesh.geometry.dispose();
    }

    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose());
    } else if (material) {
      material.dispose();
    }
  });
}

export function LayoutPreview3D({ result }: LayoutPreview3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f8fafc');

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.01, 100);
    const group = new THREE.Group();
    scene.add(group);

    const light = new THREE.DirectionalLight('#ffffff', 2.4);
    light.position.set(3, 5, 4);
    scene.add(light);
    scene.add(new THREE.AmbientLight('#ffffff', 1.7));

    const maxDimension =
      result.mode === 'normal'
        ? Math.max(result.paper.width, result.paper.height)
        : Math.max(result.placedWidth, result.placedHeight);
    const scale = maxDimension > 0 ? 4 / maxDimension : 1;

    if (result.mode === 'normal') {
      const paper = createBox(
        result.paper.width * scale,
        result.paper.height * scale,
        PAPER_THICKNESS,
        '#e2e8f0',
      );
      paper.position.y = 0;
      group.add(paper);
      addEdges(paper, group, '#64748b');

      const usable = createBox(
        result.usableWidth * scale,
        result.usableHeight * scale,
        PAPER_THICKNESS * 0.35,
        '#f8fafc',
        0.82,
      );
      usable.position.y = PAPER_THICKNESS;
      group.add(usable);

      result.positions.slice(0, MAX_RENDERED_PIECES).forEach((position) => {
        const piece =
          result.dieline.kind === 'rectangle'
            ? createBox(position.width * scale, position.height * scale, PIECE_THICKNESS, '#2563eb')
            : createDielineMesh(result.dieline, scale);

        if (result.dieline.kind === 'rectangle') {
          piece.position.x = (position.x + position.width / 2 - result.paper.width / 2) * scale;
          piece.position.z = (position.y + position.height / 2 - result.paper.height / 2) * scale;
        } else {
          piece.position.x = (position.x - result.paper.width / 2) * scale;
          piece.position.z = (position.y - result.paper.height / 2) * scale;
        }

        piece.position.y = PAPER_THICKNESS + PIECE_THICKNESS / 2;
        group.add(piece);
        addEdges(piece, group, '#1e3a8a');
      });
    } else {
      const packagePanel = createBox(
        result.placedWidth * scale,
        result.placedHeight * scale,
        PAPER_THICKNESS,
        '#fde68a',
        0.95,
      );
      group.add(packagePanel);
      addEdges(packagePanel, group, '#92400e');

      const lineMaterial = new THREE.LineBasicMaterial({ color: '#b45309' });
      const linePoints: THREE.Vector3[] = [];
      const width = result.placedWidth * scale;
      const height = result.placedHeight * scale;

      for (let xIndex = 1; xIndex < result.tilesX; xIndex += 1) {
        const x = -width / 2 + (width / result.tilesX) * xIndex;
        linePoints.push(new THREE.Vector3(x, PAPER_THICKNESS, -height / 2));
        linePoints.push(new THREE.Vector3(x, PAPER_THICKNESS, height / 2));
      }

      for (let yIndex = 1; yIndex < result.tilesY; yIndex += 1) {
        const z = -height / 2 + (height / result.tilesY) * yIndex;
        linePoints.push(new THREE.Vector3(-width / 2, PAPER_THICKNESS, z));
        linePoints.push(new THREE.Vector3(width / 2, PAPER_THICKNESS, z));
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
      group.add(new THREE.LineSegments(geometry, lineMaterial));
    }

    const cameraDistance = Math.max(3.2, 4 * CAMERA_PADDING);
    camera.position.set(0, cameraDistance * 0.82, cameraDistance);
    camera.lookAt(0, 0, 0);

    const rotation = { x: INITIAL_ROTATION_X, y: INITIAL_ROTATION_Y };
    let zoom = 1;
    let isDragging = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let animationFrame = 0;

    function render() {
      group.rotation.x = rotation.x;
      group.rotation.y = rotation.y;
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    }

    function handlePointerDown(event: PointerEvent) {
      isDragging = true;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    }

    function handlePointerMove(event: PointerEvent) {
      if (!isDragging) {
        return;
      }

      const deltaX = event.clientX - lastPointerX;
      const deltaY = event.clientY - lastPointerY;
      rotation.y += deltaX * 0.008;
      rotation.x += deltaY * 0.006;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
    }

    function handlePointerUp(event: PointerEvent) {
      isDragging = false;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
    }

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      zoom = THREE.MathUtils.clamp(zoom + (event.deltaY > 0 ? -0.08 : 0.08), 0.55, 2.2);
    }

    const resizeObserver = new ResizeObserver(() => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });

    resizeObserver.observe(container);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointercancel', handlePointerUp);
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false });
    render();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointercancel', handlePointerUp);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      disposeObject(group);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [result]);

  return (
    <div className="preview-panel">
      <div className="preview-title">
        <h4>3D 实时预览</h4>
        <span>拖拽旋转 / 滚轮缩放</span>
      </div>
      <div className="three-canvas" ref={containerRef} aria-label={`${result.packageName} 3D 排版预览`} />
    </div>
  );
}
