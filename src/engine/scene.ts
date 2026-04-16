import {
  AmbientLight,
  BackSide,
  BufferGeometry,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  Fog,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  SphereGeometry,
  WebGLRenderer,
} from 'three';
import { DAY_DUR } from '../game/constants';

export interface SceneBundle {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  ambL: AmbientLight;
  sunL: DirectionalLight;
  moonL: DirectionalLight;
  skyMat: MeshBasicMaterial;
  sunM: Mesh;
  moonM: Mesh;
  stars: Points;
}

export function createScene(canvas: HTMLCanvasElement): SceneBundle {
  const renderer = new WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = false;

  const scene = new Scene();
  scene.fog = new Fog(0x87ceeb, 20, 60);

  const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 150);
  scene.add(camera);

  const ambL = new AmbientLight(0xffffff, 0.7);
  scene.add(ambL);
  const sunL = new DirectionalLight(0xfffbe0, 0.9);
  sunL.position.set(60, 120, 60);
  scene.add(sunL);
  const moonL = new DirectionalLight(0x334466, 0.25);
  moonL.position.set(-60, 120, -60);
  scene.add(moonL);

  const skyGeo = new SphereGeometry(130, 16, 16);
  const skyMat = new MeshBasicMaterial({ color: 0x87ceeb, side: BackSide });
  const sky = new Mesh(skyGeo, skyMat);
  scene.add(sky);

  const starGeo = new BufferGeometry();
  const sv: number[] = [];
  for (let i = 0; i < 1500; i++) {
    const t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
    sv.push(Math.sin(p) * Math.cos(t) * 120, Math.cos(p) * 120, Math.sin(p) * Math.sin(t) * 120);
  }
  starGeo.setAttribute('position', new Float32BufferAttribute(sv, 3));
  const stars = new Points(starGeo, new PointsMaterial({ color: 0xffffff, size: 0.4 }));
  stars.visible = false;
  scene.add(stars);

  const sunM = new Mesh(new SphereGeometry(4, 8, 8), new MeshBasicMaterial({ color: 0xffee44 }));
  scene.add(sunM);
  const moonM = new Mesh(new SphereGeometry(2.5, 8, 8), new MeshBasicMaterial({ color: 0xccddff }));
  scene.add(moonM);

  return { renderer, scene, camera, ambL, sunL, moonL, skyMat, sunM, moonM, stars };
}

export interface DayNightState {
  worldTime: number;
  isDay: boolean;
}

export function updateSky(bundle: SceneBundle, state: DayNightState, dt: number): void {
  state.worldTime = (state.worldTime + dt / DAY_DUR) % 1;
  state.isDay = state.worldTime < 0.5;
  const ang = state.worldTime * Math.PI * 2;
  const sr = 100;
  bundle.sunL.position.set(Math.cos(ang) * sr, Math.sin(ang) * sr, 60);
  bundle.sunL.intensity = Math.max(0, Math.sin(ang));
  bundle.moonL.intensity = Math.max(0, -Math.sin(ang) * 0.35);

  const cp = bundle.camera.position;
  bundle.sunM.position.set(cp.x + Math.cos(ang) * 80, cp.y + Math.sin(ang) * 80, cp.z);
  bundle.moonM.position.set(cp.x - Math.cos(ang) * 80, cp.y - Math.sin(ang) * 80, cp.z);
  bundle.stars.visible = !state.isDay;

  const day = new Color(0x87ceeb), night = new Color(0x050a1a), dusk = new Color(0xff7733);
  let sc: Color;
  const t = state.worldTime;
  if (t < 0.05) sc = dusk.clone().lerp(day, t * 20);
  else if (t < 0.45) sc = day.clone();
  else if (t < 0.5) sc = day.clone().lerp(dusk, (t - 0.45) * 20);
  else if (t < 0.55) sc = dusk.clone().lerp(night, (t - 0.5) * 20);
  else if (t < 0.95) sc = night.clone();
  else sc = night.clone().lerp(dusk, (t - 0.95) * 20);
  bundle.skyMat.color.copy(sc);
  bundle.scene.fog!.color.copy(sc);
  bundle.scene.background = sc;
  bundle.ambL.intensity = state.isDay ? 0.7 : 0.12;
}